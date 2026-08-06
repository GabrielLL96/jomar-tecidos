-- Corrige duas lacunas achadas testando /admin/configuracoes:
--
-- 1. GRANT ausente em site_settings pro role authenticated — mesma lacuna já
--    corrigida em outras 9 tabelas (20260805000000, 20260805120000): RLS
--    existe, mas sem GRANT o Postgres nem chega a avaliar a policy
--    ("permission denied for table site_settings").
--
-- 2. A policy de leitura (site_settings_read_staff) era staff-only, herdada
--    do desenho original ("admin-only, painel Jomar Admin", ver schema
--    inicial). Mas a tabela passou a guardar conteúdo público da Home
--    (hero/banner/categorias/rodapé) — qualquer visitante do site precisa
--    poder ler, não só staff logado. Escrita continua admin-only (policies
--    existentes site_settings_write_admin/site_settings_update_admin).

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

drop policy "site_settings_read_staff" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select using (true);
