-- Expurgo automático de logs técnicos (LGPD — minimização/retenção).
--
-- error_logs guarda user_id/user_email/user_agent; integration_logs guarda
-- payload de chamada a Asaas/Melhor Envio/Resend. Sem expurgo, crescem pra
-- sempre e a política de privacidade não tem prazo concreto pra citar.
--
-- Prazos (decididos em 2026-10-02, citados no item 7 da política):
--   error_logs        90 dias  — suficiente pra investigar bug
--   integration_logs 180 dias  — cobre janela de chargeback/disputa de entrega
--
-- activity_logs fica de fora de propósito: é trilha de auditoria de ação
-- administrativa, não log técnico.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

create or replace function public.purge_old_logs()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.error_logs where created_at < now() - interval '90 days';
  delete from public.integration_logs where created_at < now() - interval '180 days';
$$;

revoke execute on function public.purge_old_logs() from public, anon, authenticated;

-- cron.schedule com nome existente atualiza o job (pg_cron >= 1.3) — idempotente.
-- 03:17 UTC (00:17 BRT): fora do pico e fora do minuto cheio.
select cron.schedule('purge-old-logs', '17 3 * * *', 'select public.purge_old_logs()');

-- Item 6 (2026-10-02): marketing promocional removido da política — feature
-- nunca existiu. Tabela mantida (sem PII, sem uso); se marketing for construído,
-- volta com opt-in explícito no cadastro.
comment on table public.marketing_campaigns is
  'SEM USO desde a criação. Marketing promocional removido da política de privacidade em 2026-10-02. Não ativar sem implementar opt-in (consentimento LGPD art. 7º, I).';
