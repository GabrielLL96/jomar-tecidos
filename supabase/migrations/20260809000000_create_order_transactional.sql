-- Checkout era uma sequência de INSERTs/UPDATEs separados do client
-- (CheckoutPage.tsx) sem transação — uma falha no meio (achado real: item de
-- carrinho com color_id órfão) deixava um pedido criado com 0 itens, visível
-- pro cliente e pro admin (ver ADR-012, limitação conhecida). Além disso,
-- order_items.unit_price vinha direto do client sem nenhuma validação contra
-- o preço real do produto — qualquer chamada direta via supabase-js (anon key
-- é pública no bundle) podia inserir um pedido com preço arbitrário.
--
-- create_order() move a sequência inteira pra dentro de uma function
-- security definer: o corpo roda numa transação implícita, então qualquer
-- exception (estoque insuficiente, produto/cupom inválido) desfaz tudo —
-- nunca sobra pedido parcial. unit_price é sempre lido de products, nunca do
-- parâmetro do client. FOR UPDATE trava a linha do produto e do cupom
-- durante a função, evitando overselling/estouro de max_uses em compra
-- concorrente (dois clientes levando o último metro do mesmo tecido, ou
-- usando o último uso do mesmo cupom, ao mesmo tempo).
--
-- Não recalcula shipping_cost server-side (continua vindo do client, baseado
-- no threshold de site_settings) — fora do escopo desta correção, que é
-- sobre atomicidade e preço por item, não sobre reconstruir toda a regra de
-- frete em SQL. Limitação conhecida, documentada em _Feedback.md.
create or replace function public.create_order(
  p_shipping_address_id uuid,
  p_payment_method public.payment_method,
  p_coupon_id uuid,
  p_shipping_cost numeric,
  p_items jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_name text;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_item jsonb;
  v_product record;
  v_coupon record;
  v_meters numeric;
  v_unit_price numeric;
  v_item_total numeric;
  v_new_stock numeric;
  v_new_status public.product_status;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if p_shipping_cost < 0 then
    raise exception 'Frete inválido';
  end if;

  if not exists (
    select 1 from public.addresses where id = p_shipping_address_id and user_id = v_user_id
  ) then
    raise exception 'Endereço não pertence ao usuário';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  select name into v_actor_name from public.users where id = v_user_id;

  insert into public.orders (
    user_id, status, payment_method, subtotal, shipping_cost, discount_total, total,
    coupon_id, shipping_address_id
  )
  values (v_user_id, 'paid', p_payment_method, 0, p_shipping_cost, 0, 0, p_coupon_id, p_shipping_address_id)
  returning orders.id, orders.order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_meters := (v_item ->> 'meters')::numeric;
    if v_meters is null or v_meters <= 0 then
      raise exception 'Quantidade inválida no item';
    end if;

    select stock_meters, min_stock_meters, status, price_per_meter
      into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid
      for update;

    if not found then
      raise exception 'Produto não encontrado: %', (v_item ->> 'product_id');
    end if;

    if v_product.stock_meters < v_meters then
      raise exception 'Estoque insuficiente para o produto %', (v_item ->> 'product_id');
    end if;

    v_unit_price := v_product.price_per_meter;
    v_item_total := v_meters * v_unit_price;
    v_subtotal := v_subtotal + v_item_total;

    insert into public.order_items (order_id, product_id, color_id, meters, unit_price, total)
    values (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      nullif(v_item ->> 'color_id', '')::uuid,
      v_meters,
      v_unit_price,
      v_item_total
    );

    v_new_stock := v_product.stock_meters - v_meters;
    v_new_status := case
      when v_product.status = 'draft' then 'draft'
      when v_new_stock <= 0 then 'out_of_stock'
      when v_product.min_stock_meters > 0 and v_new_stock <= v_product.min_stock_meters then 'low_stock'
      else 'active'
    end;

    update public.products
      set stock_meters = v_new_stock, status = v_new_status
      where id = (v_item ->> 'product_id')::uuid;

    insert into public.stock_movements (product_id, quantity, reason, user_id, performed_by_name)
    values (
      (v_item ->> 'product_id')::uuid,
      -v_meters,
      'Venda #' || v_order_number,
      v_user_id,
      coalesce(v_actor_name, 'Cliente')
    );
  end loop;

  if p_coupon_id is not null then
    select type, value, max_uses, used_count, expires_at, status
      into v_coupon
      from public.coupons
      where id = p_coupon_id
      for update;

    if not found then
      raise exception 'Cupom não encontrado';
    end if;
    if v_coupon.status <> 'active' then
      raise exception 'Cupom não está ativo';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      raise exception 'Cupom expirado';
    end if;
    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'Cupom esgotado';
    end if;

    v_discount := case v_coupon.type
      when 'percentage' then v_subtotal * (v_coupon.value / 100)
      when 'fixed' then least(v_coupon.value, v_subtotal)
      when 'free_shipping' then p_shipping_cost
      else 0
    end;

    update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
  end if;

  v_total := v_subtotal + p_shipping_cost - v_discount;

  update public.orders
    set subtotal = v_subtotal, discount_total = v_discount, total = v_total
    where orders.id = v_order_id;

  insert into public.order_status_history (order_id, status, changed_by_name)
  values (v_order_id, 'paid', coalesce(v_actor_name, 'Cliente'));

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order(uuid, public.payment_method, uuid, numeric, jsonb) to authenticated;
