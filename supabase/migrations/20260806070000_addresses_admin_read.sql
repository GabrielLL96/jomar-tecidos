-- /admin/usuarios mostra endereços reais do cliente na view de detalhe.
-- addresses_select_own (RLS existente) só deixa o próprio dono ler — sem
-- policy nova, admin não consegue ver endereço de outro usuário. GRANT de
-- tabela já existe (20260805120000_catalog_backend_readiness.sql já cobria
-- addresses), só falta a policy de leitura admin.
create policy "addresses_select_admin" on public.addresses for select
  using (public.current_user_role() = 'admin');
