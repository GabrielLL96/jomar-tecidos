-- Auditoria de segurança (skill security-review) encontrou 2 falhas na área
-- de orders, na mesma classe do fix já aplicado em public.users (ccc739c):
--
-- 1) orders_update_staff libera UPDATE pra 'vendas'/'estoque' via RLS, mas o
-- GRANT UPDATE concedido em 20260807000000_orders_backend_readiness.sql é
-- tabela inteira, sem restrição de coluna. AdminSalesOrderDetailPage.tsx só
-- escreve `status` e `cancel_reason` (únicas colunas que a UI de Vendas
-- edita), mas nada no banco impede uma conta 'vendas'/'estoque' de rodar
-- `.update({ total: 1, discount_total: 999, user_id: outroId })` direto do
-- console do navegador em qualquer pedido — sem precisar de acesso admin,
-- só de uma conta staff de nível mais baixo. Fix: GRANT passa a valer só
-- pras duas colunas realmente usadas pelo fluxo de status/cancelamento.
--
-- 2) order_status_history_insert aceita insert do próprio dono do pedido
-- (`orders.user_id = auth.uid()`) sem checar se o `status` inserido bate com
-- o status real do pedido. Levantamento em src/ e supabase/functions/ não
-- achou NENHUM fluxo de cliente que insira nessa tabela — só
-- AdminSalesOrderDetailPage.tsx (staff, sessão autenticada) e as Edge
-- Functions do Asaas (service_role, que já bypassa RLS). O branch "dono do
-- pedido" da policy é superfície de ataque morta: permite ao cliente forjar
-- `status: 'delivered'` a qualquer momento no próprio pedido, o que
-- AdminReportsPage.tsx (exportDeliverySLA) pode ler como se fosse real já
-- que a query em queries.ts não ordena por created_at. Fix: remove o branch
-- de dono, insert fica restrito a staff.

revoke update on public.orders from authenticated;
grant update (status, cancel_reason) on public.orders to authenticated;

drop policy "order_status_history_insert" on public.order_status_history;
create policy "order_status_history_insert" on public.order_status_history for insert
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
