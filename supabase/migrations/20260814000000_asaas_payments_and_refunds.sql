-- ============================================================================
-- Fase 2 da integração Asaas (checkout real): tabelas de cobrança/reembolso,
-- novo status de pedido, e coluna de customer Asaas por usuário.
-- Ver spec: projetos/trabalho/Jomartecidos/specs/2026-08-13-asaas-checkout-pagamento-design.md
-- ============================================================================

-- POST /v3/payments exige um customer já cadastrado na Asaas — coluna nova,
-- preenchida sob demanda no primeiro checkout real de cada usuário (nunca
-- pré-populada em massa).
alter table public.users add column asaas_customer_id text;

-- order_status ganha "refunded", distinto de "cancelled" (pedido nunca
-- chegou a ser cobrado) — reembolso é dinheiro que já foi cobrado e voltou.
alter type public.order_status add value 'refunded';

-- ============================================================================
-- ORDER_PAYMENTS
-- Uma linha por tentativa de cobrança real na Asaas. Tabela própria (não
-- colunas em `orders`) porque os 3 métodos devolvem formatos bem diferentes
-- (Pix = QR/copia-cola; boleto = URL/código de barras; cartão = invoiceUrl
-- hospedada) — motivo completo no spec.
-- ============================================================================

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  asaas_payment_id text unique,
  payment_method public.payment_method not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'overdue', 'cancelled', 'refunded')),
  amount numeric(10, 2) not null check (amount >= 0),
  pix_qr_code text,
  pix_copy_paste text,
  boleto_url text,
  boleto_barcode text,
  invoice_url text,
  due_date date,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_payments_order_id_idx on public.order_payments (order_id);
create index order_payments_asaas_payment_id_idx on public.order_payments (asaas_payment_id);

create trigger order_payments_handle_updated_at
  before update on public.order_payments
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.order_payments enable row level security;

create policy "order_payments_select_own" on public.order_payments for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_payments.order_id and orders.user_id = auth.uid()
    )
  );

create policy "order_payments_select_staff" on public.order_payments for select
  using (public.current_user_role() in ('admin', 'vendas'));

-- Escrita só via service_role (Edge Functions asaas-create-charge/asaas-webhook)
-- — client nunca insere/atualiza essa tabela direto.
grant select on public.order_payments to authenticated;
grant select, insert, update on public.order_payments to service_role;

-- ============================================================================
-- REFUNDS
-- 1:N de propósito — suporta múltiplos reembolsos parciais no mesmo pedido.
-- ============================================================================

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  amount numeric(10, 2) not null check (amount > 0),
  reason text not null,
  asaas_refund_id text,
  requested_by uuid references public.users (id) on delete set null,
  requested_by_name text not null,
  created_at timestamptz not null default now()
);

create index refunds_order_id_idx on public.refunds (order_id);

alter table public.refunds enable row level security;

create policy "refunds_select_staff" on public.refunds for select
  using (public.current_user_role() in ('admin', 'vendas'));

-- Escrita só via service_role (Edge Function asaas-refund).
grant select on public.refunds to authenticated;
grant select, insert on public.refunds to service_role;

-- service_role precisa ler/escrever orders/users/order_status_history pra
-- orquestrar todo o fluxo (mesmo achado já documentado 6x neste projeto:
-- service_role não faz bypass automático de GRANT/RLS aqui).
grant select, update on public.users to service_role;
grant select, update on public.orders to service_role;
grant select, insert on public.order_status_history to service_role;
