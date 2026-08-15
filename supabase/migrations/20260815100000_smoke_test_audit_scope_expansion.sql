-- ============================================================================
-- Smoke test dos triggers novos (20260815090000) em stock_movements/
-- refunds/order_payments — mesmo padrão de 20260815060000: insere/atualiza
-- dentro de um bloco que sempre reverte via savepoint implícito de exception
-- handler, sem deixar resíduo. Se algum trigger lançar exceção de verdade,
-- o `raise;` no branch else propaga e falha a migration visivelmente.
-- ============================================================================

do $$
declare
  v_product_id uuid;
  v_order_id uuid;
  v_user_id uuid;
  v_address_id uuid;
  v_payment_id uuid;
begin
  select id into v_product_id from public.products limit 1;
  select id into v_user_id from public.users limit 1;
  select id into v_address_id from public.addresses limit 1;

  if v_product_id is null or v_user_id is null or v_address_id is null then
    raise notice 'smoke test pulado: sem dado real suficiente';
    return;
  end if;

  insert into public.orders (
    order_number, user_id, status, payment_method, subtotal, total, shipping_address_id
  ) values (
    'SMOKE-TEST-SCOPE-ROLLBACK', v_user_id, 'pending', 'pix', 10, 10, v_address_id
  ) returning id into v_order_id;

  insert into public.stock_movements (product_id, quantity, reason, user_id, performed_by_name)
  values (v_product_id, 1, 'smoke test', v_user_id, 'Smoke Test');

  insert into public.order_payments (order_id, payment_method, status, amount, invoice_url, due_date)
  values (v_order_id, 'pix', 'pending', 10, 'https://example.com', current_date)
  returning id into v_payment_id;

  update public.order_payments set status = 'confirmed' where id = v_payment_id;

  insert into public.refunds (order_id, amount, reason, requested_by, requested_by_name)
  values (v_order_id, 5, 'smoke test', v_user_id, 'Smoke Test');

  raise exception 'smoke_test_rollback_marker';
exception
  when others then
    if sqlerrm = 'smoke_test_rollback_marker' then
      raise notice 'smoke test OK: triggers de stock_movements/order_payments/refunds não quebram insert/update, rollback limpo';
    else
      raise notice 'smoke test FALHOU de verdade: %', sqlerrm;
      raise;
    end if;
end $$;
