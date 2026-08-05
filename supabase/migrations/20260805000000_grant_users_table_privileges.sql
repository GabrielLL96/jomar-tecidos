-- public.users não tinha NENHUM GRANT para o role "authenticated" (nem SELECT).
-- A migration inicial criou RLS policies (users_select_own, users_update_own)
-- mas RLS é uma segunda camada — sem o GRANT de tabela/coluna correspondente,
-- toda query falha antes mesmo da RLS avaliar a linha:
--   permission denied for table users (42501)
-- Isso só foi descoberto agora porque o frontend era 100% mockado até esta
-- sessão; nenhuma query real contra public.users tinha sido feita antes.
--
-- Fix: conceder o mínimo necessário. SELECT completo (a RLS já restringe a
-- própria linha via users_select_own); UPDATE só em name/phone (os únicos
-- campos que o app edita) — role/status/email/id/created_at/last_login_at
-- ficam de fora, evitando também auto-escalação de role por esse caminho.

grant select on public.users to authenticated;
grant update (name, phone) on public.users to authenticated;
