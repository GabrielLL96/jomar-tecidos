-- ============================================================================
-- integration_logs: chamadas de saída pra Asaas/Melhor Envio (e eventos de
-- webhook recebidos) — diferente de activity_logs (escrita em tabela de
-- negócio) e error_logs (exceção em runtime). Escopo desta rodada: só Asaas
-- e Melhor Envio (GTM fica de fora — não existe nenhum dataLayer.push() de
-- conversão no código hoje, seria construir a feature em si, não só logar
-- ela; alerta automático de falha em sequência também fica de fora — não
-- existe canal de notificação (e-mail/webhook) no projeto).
--
-- request_summary/response_summary são SEMPRE um resumo explícito montado
-- pelo call site (allowlist), nunca o body cru da chamada — decisão
-- deliberada depois de revisar asaas-charge-card/index.ts, que já tem uma
-- invariante de código (ADR-016) proibindo logar dado de cartão em qualquer
-- lugar. Um "mascarar(payload)" genérico por nome de campo é um denylist —
-- erra por omissão sempre que o shape muda. Aqui cada função sabe o que é
-- seguro incluir e constrói o resumo ela mesma.
-- ============================================================================

create table public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration text not null check (integration in ('asaas', 'melhor_envio')),
  operation text not null,
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  related_entity text,
  related_entity_id uuid,
  request_summary jsonb,
  response_summary jsonb,
  status_http int,
  status text not null default 'success' check (status in ('success', 'failure', 'timeout')),
  error_message text,
  duration_ms int,
  environment text not null check (environment in ('sandbox', 'production')),
  created_at timestamptz not null default now()
);

create index integration_logs_integration_idx on public.integration_logs (integration, created_at desc);
create index integration_logs_entity_idx on public.integration_logs (related_entity, related_entity_id);
create index integration_logs_status_idx on public.integration_logs (status);

alter table public.integration_logs enable row level security;

-- Leitura: admin-only, mesmo padrão de activity_logs/error_logs.
create policy "integration_logs_select_admin" on public.integration_logs for select
  using (public.current_user_role() = 'admin');

-- Escrita: só service_role (Edge Functions) — nenhum client (nem admin)
-- insere direto. Sem policy de insert pra `authenticated`/`anon` de
-- propósito: service_role bypassa RLS neste projeto (confirmado 10x, ver
-- rate_limit_attempts — RLS ligada sem nenhuma policy, só GRANT, e funciona),
-- só precisa do GRANT de tabela.
grant select on public.integration_logs to authenticated;
grant select, insert on public.integration_logs to service_role;
