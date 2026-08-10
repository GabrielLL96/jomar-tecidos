-- ============================================================================
-- Fix real (2ª tentativa): `upsert()` via PostgREST (Prefer:
-- resolution=merge-duplicates) faz um INSERT ... ON CONFLICT DO UPDATE que,
-- internamente, exige SELECT de tabela inteira pro papel que chama — não dá
-- pra satisfazer isso sem reabrir leitura de client_secret/tokens pra
-- `authenticated` (a própria mensagem de erro do Postgres sugere `GRANT
-- SELECT ON melhor_envio_settings` sem lista de coluna, o que anularia a
-- restrição de coluna criada de propósito). GRANT de update em `id` (migration
-- anterior) não resolveu — o upsert em si é incompatível com SELECT
-- column-restricted.
--
-- Fix: a linha singleton passa a ser semeada aqui (como owner da migration,
-- sem passar por RLS/GRANT nenhum) — o client nunca mais precisa de upsert,
-- só UPDATE puro (`.update().eq('id', ...)`), que não exige SELECT
-- nenhum do chamador pra funcionar.
-- ============================================================================

insert into public.melhor_envio_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
