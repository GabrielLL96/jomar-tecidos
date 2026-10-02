-- Revisão de segurança client-side (2026-10-01) + regressões achadas ao
-- reler o histórico de create_order().
--
-- 1) Cotação de frete não era amarrada a nada além de id/validade/serviceId.
-- melhor-envio-shipping-calculate aceitava peso/dimensão e CEP vindos do
-- client e create_order() aceitava qualquer p_shipping_quote_id válido —
-- cotar 1 item de 1g pra um CEP vizinho e usar o quoteId num pedido de 50m
-- pra outro estado passava. Fix: shipping_quotes passa a guardar o dono e o
-- carrinho cotado (a edge function agora calcula peso/dimensão a partir de
-- products, não do client), e create_order() exige dono = auth.uid(),
-- destination_zip = CEP do endereço do pedido e itens idênticos.
--
-- 2) Regressão: 20260814000200_create_order_starts_pending.sql reescreveu a
-- function a partir de uma versão anterior a 20260813040000 e perdeu, em
-- silêncio, a checagem de coupons.starts_at (cupom agendado usável antes da
-- hora) e o clamp de desconto de 20260813030000. As versões seguintes
-- (20260815010000, 20260828200000) herdaram a perda. Ambos restaurados.
--
-- 3) Produto 'draft' era comprável por quem soubesse o UUID (o case de
-- status só preservava 'draft' na baixa de estoque). Agora rejeita.
--
-- Corpo base: 20260828200000_melhor_envio_label_generation.sql (vigente).
-- Assinatura inalterada — create or replace mantém o grant execute.

alter table public.shipping_quotes
  add column user_id uuid references public.users (id) on delete cascade,
  add column items jsonb;

create or replace function public.create_order(
  p_shipping_address_id uuid,
  p_payment_method payment_method,
  p_coupon_id uuid default null,
  p_shipping_cost numeric default 0,
  p_items jsonb default '[]'::jsonb,
  p_shipping_quote_id uuid default null,
  p_shipping_service_id integer default null
)
returns table(id uuid, order_number text)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  v_order_items jsonb;
  v_address_zip text;
  v_total numeric;
  v_item jsonb;
  v_product record;
  v_coupon record;
  v_meters numeric;
  v_unit_price numeric;
  v_item_total numeric;
  v_new_stock numeric;
  v_new_status public.product_status;
  c_flat_shipping_fee constant numeric := 25;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  select regexp_replace(addresses.zip_code, '\D', '', 'g') into v_address_zip
    from public.addresses
    where addresses.id = p_shipping_address_id and addresses.user_id = v_user_id;

  if not found then
    raise exception 'Endereço não pertence ao usuário';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  select users.name into v_actor_name from public.users where users.id = v_user_id;

  insert into public.orders (
    user_id, status, payment_method, subtotal, shipping_cost, discount_total, total,
    coupon_id, shipping_address_id, shipping_service_id
  )
  values (v_user_id, 'pending', p_payment_method, 0, 0, 0, 0, p_coupon_id, p_shipping_address_id, p_shipping_service_id)
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

    if v_product.status = 'draft' then
      raise exception 'Produto indisponível: %', (v_item ->> 'product_id');
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

  -- Mesmo formato que melhor-envio-shipping-calculate grava em
  -- shipping_quotes.items: { product_id: metros somados, 2 casas }.
  select jsonb_object_agg(grouped.product_id, grouped.meters)
    into v_order_items
    from (
      select item ->> 'product_id' as product_id,
             round(sum((item ->> 'meters')::numeric), 2) as meters
        from jsonb_array_elements(p_items) as item
        group by item ->> 'product_id'
    ) as grouped;

  if p_shipping_quote_id is not null and p_shipping_service_id is not null then
    select shipping_quotes.options, shipping_quotes.expires_at, shipping_quotes.user_id,
           shipping_quotes.destination_zip, shipping_quotes.items
      into v_quote
      from public.shipping_quotes
      where shipping_quotes.id = p_shipping_quote_id;

    if not found then
      raise exception 'Cotação de frete não encontrada';
    end if;
    if v_quote.expires_at < now() then
      raise exception 'Cotação de frete expirada, calcule o frete de novo';
    end if;
    -- Cotação só vale pro usuário, CEP e carrinho que a geraram — sem isso,
    -- cotar 1g pra um CEP vizinho e usar o quoteId num pedido pesado pra
    -- outro estado passava (servidor só checava id/validade/serviceId).
    if v_quote.user_id is distinct from v_user_id then
      raise exception 'Cotação de frete não pertence a este usuário';
    end if;
    if v_quote.destination_zip <> v_address_zip then
      raise exception 'Cotação de frete foi feita para outro CEP, calcule o frete de novo';
    end if;
    if v_quote.items is distinct from v_order_items then
      raise exception 'Carrinho mudou desde a cotação de frete, calcule o frete de novo';
    end if;

    select (opt ->> 'price')::numeric into v_shipping_cost
      from jsonb_array_elements(v_quote.options) as opt
      where (opt ->> 'serviceId')::int = p_shipping_service_id;

    if v_shipping_cost is null then
      raise exception 'Opção de frete inválida pra essa cotação';
    end if;
  else
    -- Taxa fixa sem cotação continua aceita de propósito: é o fallback do
    -- checkout quando falta peso/dimensão OU a API da Melhor Envio falha
    -- (exigir cotação derrubaria toda venda numa queda da API). Perda máxima
    -- por pedido = frete real - taxa fixa; ver _Feedback.md.
    v_shipping_cost := c_flat_shipping_fee;
  end if;

  select (site_settings.value)::numeric into v_free_shipping_threshold
    from public.site_settings
    where site_settings.key = 'free_shipping_threshold';

  if v_subtotal >= coalesce(v_free_shipping_threshold, 0) then
    v_shipping_cost := 0;
  end if;

  if p_coupon_id is not null then
    select coupons.type, coupons.value, coupons.max_uses, coupons.used_count,
           coupons.starts_at, coupons.expires_at, coupons.status
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
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      raise exception 'Cupom ainda não está disponível';
    end if;

    v_discount := case v_coupon.type
      when 'percentage' then v_subtotal * (v_coupon.value / 100)
      when 'fixed' then least(v_coupon.value, v_subtotal)
      when 'free_shipping' then v_shipping_cost
      else 0
    end;

    -- Clamp defensivo: desconto nunca excede subtotal+frete.
    v_discount := greatest(0, least(v_discount, v_subtotal + v_shipping_cost));

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
$function$;

