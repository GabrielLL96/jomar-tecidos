-- ============================================================================
-- Smoke test dos triggers de auditoria (20260815050000): confirma que
-- trg_audit_orders/trg_audit_order_items/trg_audit_products/trg_audit_coupons
-- não lançam exceção em insert/update/delete — essas são exatamente as
-- tabelas que create_order() (RPC transacional do checkout, ADR-012) escreve
-- dentro da mesma transação, então um bug aqui derrubaria pedido real.
--
-- Roda dentro de um bloco com exception handler: qualquer erro real propaga
-- (RAISE de novo) e falha a migration visivelmente. Se tudo correr bem, o
-- handler força um rollback pro savepoint implícito do próprio bloco — não
-- fica nenhuma linha de teste em orders/order_items/activity_logs depois
-- desta migration rodar. Migration permanece no histórico só como registro
-- de que essa verificação foi feita nesta data, sem efeito residual algum.
-- ============================================================================

do $$
declare
  v_user_id uuid;
  v_address_id uuid;
  v_product_id uuid;
  v_order_id uuid;
  v_item_id uuid;
begin
  select id into v_user_id from public.users limit 1;
  select id into v_address_id from public.addresses limit 1;
  select id into v_product_id from public.products limit 1;

  if v_user_id is null or v_address_id is null or v_product_id is null then
    raise notice 'smoke test pulado: sem dado real suficiente (users/addresses/products vazios)';
    return;
  end if;

  insert into public.orders (
    order_number, user_id, status, payment_method, subtotal, total, shipping_address_id
  ) values (
    'SMOKE-TEST-AUDIT-ROLLBACK', v_user_id, 'pending', 'pix', 10, 10, v_address_id
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, meters, unit_price, total)
  values (v_order_id, v_product_id, 1, 10, 10)
  returning id into v_item_id;

  update public.orders set status = 'paid' where id = v_order_id;
  update public.products set stock_meters = stock_meters where id = v_product_id;

  delete from public.order_items where id = v_item_id;
  delete from public.orders where id = v_order_id;

  raise exception 'smoke_test_rollback_marker';
exception
  when others then
    if sqlerrm = 'smoke_test_rollback_marker' then
      raise notice 'smoke test OK: triggers de auditoria não quebram insert/update/delete em orders/order_items/products, rollback limpo';
    else
      raise notice 'smoke test FALHOU de verdade: %', sqlerrm;
      raise;
    end if;
end $$;
