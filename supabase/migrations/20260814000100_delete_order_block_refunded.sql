-- Achado ao adicionar o status 'refunded' (Fase 2 Asaas): delete_order()
-- bloqueava exclusão só pra paid/shipping/delivered — um pedido reembolsado
-- (que teve pagamento real capturado e devolvido) ficava excluível, apesar
-- de ser exatamente o tipo de registro financeiro que essa regra existe pra
-- proteger. Mesma assinatura de parâmetro (uuid) — create or replace basta,
-- sem precisar de drop function.

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

  if v_status in ('paid', 'shipping', 'delivered', 'refunded') then
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
