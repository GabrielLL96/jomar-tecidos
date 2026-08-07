-- Pedidos saem do mock local (OrdersContext + useSecureStorage, ADR-002/005)
-- e passam a ser reais no Supabase — pré-requisito pra tela /admin/vendas,
-- que precisa ver pedido de qualquer cliente, não só o do próprio navegador.
--
-- orders/order_items/deliveries já existiam desde o schema inicial (ADR-004)
-- com RLS básica (dono via auth.uid()), mas nunca foram usados de verdade.
-- Gaps reais encontrados ao ligar o frontend:

-- 1) Mesma lacuna de GRANT já vista 4x nesse projeto (users, catálogo,
-- site_settings, stock_movements) — RLS existe desde sempre, mas sem GRANT
-- nenhuma query real funciona (permission denied antes da RLS ser avaliada).
grant select, insert, update on public.orders, public.order_items, public.deliveries to authenticated;

-- 2) Só existia policy "_select_own" (dono do pedido) — um staff olhando
-- /admin/vendas não é dono de nenhum pedido de cliente, leria zero linhas.
create policy "orders_select_staff" on public.orders for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "order_items_select_staff" on public.order_items for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "deliveries_select_staff" on public.deliveries for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));

-- 3) order_number era not null sem default — o mock gerava "JT-XXXX"
-- client-side (4 dígitos aleatórios, colisão possível). Sequence garante
-- unicidade real no servidor.
create sequence public.order_number_seq;
alter table public.orders alter column order_number
  set default 'JT-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

-- 4) Cancelamento de pedido (tela de Vendas) precisa registrar o motivo.
alter table public.orders add column cancel_reason text;

-- 5) "Histórico de status" no detalhe do pedido — não existia tabela.
-- Mesmo padrão já validado em stock_movements (ADR-010): uma linha por
-- mudança, changed_by_name snapshotado (RLS de users só deixa ler o
-- próprio registro, então não dá pra confiar em join pra mostrar quem mudou).
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by_name text not null,
  created_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on public.order_status_history (order_id);

alter table public.order_status_history enable row level security;

create policy "order_status_history_select_own" on public.order_status_history for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_status_history.order_id and orders.user_id = auth.uid()
  ));
create policy "order_status_history_select_staff" on public.order_status_history for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "order_status_history_insert" on public.order_status_history for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id and orders.user_id = auth.uid()
    )
    or public.current_user_role() in ('admin', 'vendas', 'estoque')
  );

grant select, insert on public.order_status_history to authenticated;

-- 6) coupons.used_count nunca era incrementado em lugar nenhum do código
-- (nem no mock) — sem isso max_uses nunca funciona de verdade. RLS de
-- coupons só permite UPDATE por admin (coupons_update_admin); um cliente
-- comprando não pode incrementar direto. Function security definer
-- (mesmo padrão de current_user_role()) resolve sem abrir UPDATE geral
-- da tabela pro cliente.
create or replace function public.increment_coupon_usage(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
end;
$$;

create or replace function public.decrement_coupon_usage(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons set used_count = greatest(0, used_count - 1) where id = p_coupon_id;
end;
$$;

grant execute on function public.increment_coupon_usage(uuid) to authenticated;
grant execute on function public.decrement_coupon_usage(uuid) to authenticated;
