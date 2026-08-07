-- Ações "Ver detalhes" / "Excluir pedido" na tabela de Vendas. Exclusão de
-- pedido é soft-delete (deleted_at) — nunca exclusão física, pedido é
-- registro fiscal/histórico. Bloqueada quando o pedido já tem pagamento
-- aprovado (status paid/shipping/delivered): precisa cancelar/estornar
-- primeiro (fluxo já existente, orders.status = 'cancelled').

alter table public.orders add column deleted_at timestamptz;

-- A escrita nessa coluna especificamente só pode acontecer através da
-- function abaixo (security definer) — não pela GRANT genérica de UPDATE
-- em orders já concedida em 20260807000000 (que cobre status/cancel_reason
-- para o fluxo de status/cancelamento já existente). Sem isso, a regra de
-- "só admin/vendas, só se não tiver pagamento aprovado" seria só convenção
-- de client, não uma garantia real — qualquer chamada direta via
-- supabase-js contornaria a function.
revoke update (deleted_at) on public.orders from authenticated;

create or replace function public.delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_actor_name text;
begin
  if public.current_user_role() not in ('admin', 'vendas') then
    raise exception 'Sem permissão para excluir pedidos';
  end if;

  select status into v_status
  from public.orders
  where id = p_order_id and deleted_at is null;

  if v_status is null then
    raise exception 'Pedido não encontrado';
  end if;

  if v_status in ('paid', 'shipping', 'delivered') then
    raise exception 'Pedido tem pagamento aprovado — cancele e estorne antes de excluir';
  end if;

  update public.orders set deleted_at = now() where id = p_order_id;

  select name into v_actor_name from public.users where id = auth.uid();

  insert into public.activity_logs (user_id, action, details)
  values (
    auth.uid(),
    'Excluiu pedido',
    coalesce(v_actor_name, 'Desconhecido') || ' excluiu o pedido ' || p_order_id::text
  );
end;
$$;

grant execute on function public.delete_order(uuid) to authenticated;
