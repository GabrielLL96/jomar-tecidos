-- addresses_select_admin (20260806070000) só libera 'admin' — mas a tela de
-- Vendas (20260807000000_orders_backend_readiness.sql) libera leitura de
-- pedidos pro staff geral (admin/vendas/estoque). Sem essa policy, um usuário
-- 'vendas' abrindo o detalhe de um pedido não conseguiria ver o endereço de
-- entrega. Mesmo conjunto de papéis já usado em orders/order_items/deliveries,
-- por consistência (endereço é só mais um dado do mesmo pedido).
create policy "addresses_select_staff" on public.addresses for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));
