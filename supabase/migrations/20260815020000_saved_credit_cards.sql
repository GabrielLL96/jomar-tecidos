-- ============================================================================
-- Cobrança direta com cartão (tokenização) — decisão explícita do usuário de
-- reabrir escopo PCI-DSS (SAQ A-EP) já rejeitado em ADR-016 "Investigação
-- adicional": dado de cartão passa a trafegar pela Edge Function
-- asaas-charge-card antes de ir pra Asaas, em vez de só pela invoiceUrl
-- hospedada. NUNCA armazenamos número/CVV/validade — só o creditCardToken
-- que a Asaas devolve depois da autorização, mais os últimos 4 dígitos e a
-- bandeira (dado não sensível, só pra exibição "Cartão final 1234").
-- ============================================================================

create table public.saved_credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  credit_card_token text not null,
  last_four_digits text not null,
  brand text,
  created_at timestamptz not null default now()
);

create index saved_credit_cards_user_id_idx on public.saved_credit_cards (user_id);

alter table public.saved_credit_cards enable row level security;

create policy "saved_credit_cards_select_own" on public.saved_credit_cards for select
  using (user_id = auth.uid());

-- Escrita só via service_role (Edge Function asaas-charge-card) — client
-- nunca insere/atualiza essa tabela direto, mesmo padrão de order_payments.
grant select on public.saved_credit_cards to authenticated;
grant select, insert on public.saved_credit_cards to service_role;
