-- Fecha o último gap documentado no spec 2026-08-13-melhor-envio-fase2:
-- o caminho de taxa fixa (produto sem peso/dimensão, sem cotação real) ainda
-- confiava cegamente em p_shipping_cost vindo do client. Frete grátis e
-- cotação real já eram validados no servidor desde 20260813000100.
--
-- Fix: mesmo padrão já usado pros outros dois casos (nunca confia no client,
-- sempre recalcula) — na ausência de cotação, o servidor ignora
-- p_shipping_cost e usa o valor fixo conhecido. Esse valor não é configurável
-- via site_settings (BUSINESS.flatShippingFee, src/lib/constants.ts, ainda é
-- hardcoded — nenhuma UI de admin edita isso hoje), então fica hardcoded aqui
-- também. Se flatShippingFee virar editável no admin, promover pra uma chave
-- em site_settings e ler de lá, igual free_shipping_threshold.
--
-- Mesma assinatura de parâmetros da versão anterior (7 params, mesmos
-- tipos) — create or replace basta, sem precisar de drop function.

create or replace function public.create_order(
  p_shipping_address_id uuid,
  p_payment_method public.payment_method,
  p_coupon_id uuid default null,
  p_shipping_cost numeric default 0,
  p_items jsonb default '[]'::jsonb,
  p_shipping_quote_id uuid default null,
  p_shipping_service_id integer default null
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
  v_shipping_cost numeric;
  v_free_shipping_threshold numeric;
  v_quote record;
  v_total numeric;
  v_item jsonb;
  v_product record;
  v_coupon record;
  v_meters numeric;
  v_unit_price numeric;
  v_item_total numeric;
  v_new_stock numeric;
  v_new_status public.product_status;
  -- Deve bater com BUSINESS.flatShippingFee (src/lib/constants.ts). Duplicação
  -- aceita porque o valor não é configurável em runtime hoje — se um dos dois
  -- lados mudar, o outro precisa mudar junto (mesmo trade-off já existente
  -- pra outras constantes espelhadas neste projeto).
  c_flat_shipping_fee constant numeric := 25;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.addresses
    where addresses.id = p_shipping_address_id and addresses.user_id = v_user_id
  ) then
    raise exception 'Endereço não pertence ao usuário';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  select users.name into v_actor_name from public.users where users.id = v_user_id;

  insert into public.orders (
    user_id, status, payment_method, subtotal, shipping_cost, discount_total, total,
    coupon_id, shipping_address_id
  )
  values (v_user_id, 'pending', p_payment_method, 0, 0, 0, 0, p_coupon_id, p_shipping_address_id)
  returning orders.id, orders.order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_meters := (v_item ->> 'meters')::numeric;
    if v_meters is null or v_meters <= 0 then
      raise exception 'Quantidade inválida no item';
    end if;

    select products.stock_meters, products.min_stock_meters, products.status, products.price_per_meter
      into v_product
      from public.products
      where products.id = (v_item ->> 'product_id')::uuid
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
      where products.id = (v_item ->> 'product_id')::uuid;

    insert into public.stock_movements (product_id, quantity, reason, user_id, performed_by_name)
    values (
      (v_item ->> 'product_id')::uuid,
      -v_meters,
      'Venda #' || v_order_number,
      v_user_id,
      coalesce(v_actor_name, 'Cliente')
    );
  end loop;

  -- Frete: cotação real (validada contra shipping_quotes) tem prioridade;
  -- sem cotação, o servidor usa a taxa fixa conhecida — nunca mais confia em
  -- p_shipping_cost vindo do client (esse parâmetro fica só como legado de
  -- assinatura, não é mais lido em nenhum ramo).
  if p_shipping_quote_id is not null and p_shipping_service_id is not null then
    select shipping_quotes.options, shipping_quotes.expires_at
      into v_quote
      from public.shipping_quotes
      where shipping_quotes.id = p_shipping_quote_id;

    if not found then
      raise exception 'Cotação de frete não encontrada';
    end if;
    if v_quote.expires_at < now() then
      raise exception 'Cotação de frete expirada, calcule o frete de novo';
    end if;

    select (opt ->> 'price')::numeric into v_shipping_cost
      from jsonb_array_elements(v_quote.options) as opt
      where (opt ->> 'serviceId')::int = p_shipping_service_id;

    if v_shipping_cost is null then
      raise exception 'Opção de frete inválida pra essa cotação';
    end if;
  else
    v_shipping_cost := c_flat_shipping_fee;
  end if;

  -- Frete grátis é regra do servidor, nunca confia no client — vence mesmo
  -- em cima de uma cotação real ou da taxa fixa, se o pedido já bateu o mínimo.
  select (site_settings.value)::numeric into v_free_shipping_threshold
    from public.site_settings
    where site_settings.key = 'free_shipping_threshold';

  if v_subtotal >= coalesce(v_free_shipping_threshold, 0) then
    v_shipping_cost := 0;
  end if;

  if p_coupon_id is not null then
    select coupons.type, coupons.value, coupons.max_uses, coupons.used_count, coupons.expires_at, coupons.status
      into v_coupon
      from public.coupons
      where coupons.id = p_coupon_id
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
      when 'free_shipping' then v_shipping_cost
      else 0
    end;

    update public.coupons set used_count = used_count + 1 where coupons.id = p_coupon_id;
  end if;

  v_total := v_subtotal + v_shipping_cost - v_discount;

  update public.orders
    set subtotal = v_subtotal, shipping_cost = v_shipping_cost, discount_total = v_discount, total = v_total
    where orders.id = v_order_id;

  insert into public.order_status_history (order_id, status, changed_by_name)
  values (v_order_id, 'pending', coalesce(v_actor_name, 'Cliente'));

  return query select v_order_id, v_order_number;
end;
$$;
