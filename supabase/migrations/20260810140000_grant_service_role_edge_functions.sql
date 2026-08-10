-- ============================================================================
-- Achado novo (diferente dos GRANTs faltantes já vistos ~6x neste projeto,
-- sempre sobre `authenticated`): o client `service_role` usado dentro das
-- Edge Functions (chave nova formato `sb_secret_...`, injetada
-- automaticamente como SUPABASE_SERVICE_ROLE_KEY) NÃO faz bypass automático
-- de GRANT/RLS neste projeto — testado com fetch cru direto na REST API,
-- sem passar pelo supabase-js, mesmo resultado: 403 "permission denied for
-- table site_settings", com o hint do próprio Postgres pedindo
-- "GRANT SELECT ON public.site_settings TO service_role". Ou seja:
-- `service_role` aqui se comporta como um role comum, precisa de GRANT
-- explícito por tabela igual `authenticated`/`anon` — não dá pra assumir
-- que Edge Function com a chave de serviço sempre lê/escreve tudo.
--
-- GRANT das duas tabelas que as Edge Functions da integração Melhor Envio
-- tocam via client de serviço: site_settings (lê footer_zip, origem do
-- frete) e melhor_envio_settings (lê/grava token — já era só acessível por
-- service_role de propósito, ver migration 20260810120000).
-- ============================================================================

grant select on public.site_settings to service_role;
grant select, update on public.melhor_envio_settings to service_role;
