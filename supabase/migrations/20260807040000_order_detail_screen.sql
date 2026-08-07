-- Tela dedicada de Detalhe do Pedido (/admin/vendas/:id, substitui o modal).
--
-- Rastreio nessa tela só coleta código de rastreio + URL (opcional) — sem
-- campo de transportadora nem previsão de entrega, diferente do fluxo antigo
-- "marcar como enviado" que este prompt substitui. carrier/eta_date viram
-- opcionais pra não quebrar o insert quando só código+URL são informados.
alter table public.deliveries alter column carrier drop not null;
alter table public.deliveries alter column eta_date drop not null;
alter table public.deliveries add column tracking_url text;

-- Permissões desta tela: ver detalhe é admin/vendas (já coberto pela RLS de
-- select existente), mas avançar status e excluir pedido são admin-only —
-- mais restrito que o "admin/vendas" do delete_order original
-- (20260807030000), que este prompt substitui.
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
  if public.current_user_role() <> 'admin' then
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
