-- ============================================================================
-- Fix: `upsert()` do PostgREST (resolution=merge-duplicates) faz
-- `insert ... on conflict (id) do update set` incluindo TODAS as colunas do
-- payload, inclusive `id` — a migration anterior (20260810120000) só tinha
-- dado GRANT de update em client_id/client_secret/redirect_uri, sem `id`,
-- então todo upsert (inclusive o primeiro insert, que passa pelo mesmo
-- caminho de query) falhava com "permission denied for table
-- melhor_envio_settings". Mesma classe de bug de GRANT ausente já vista 5x
-- neste projeto (users/catálogo/site_settings/stock/activity_logs), causa
-- ligeiramente diferente desta vez.
-- ============================================================================

grant update (id, client_id, client_secret, redirect_uri) on public.melhor_envio_settings to authenticated;
