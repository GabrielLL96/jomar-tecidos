-- Tela /admin/usuarios: hoje NINGUÉM consegue listar todos os usuários — a
-- única policy de leitura em public.users é users_select_own
-- (auth.uid() = id). Sem policy nova, a listagem (primeiro requisito da
-- tela) nem carrega.
--
-- Escopo desta migration ficou restrito a admin (não staff geral): gerenciar
-- papel/status de outros usuários é ação mais sensível que editar catálogo
-- (risco de escalação de privilégio), e o AdminLayout já trava o painel
-- inteiro em role='admin' mesmo — não há hoje vendas/estoque/etc navegando
-- pra essa tela de qualquer forma.
create policy "users_select_admin" on public.users for select
  using (public.current_user_role() = 'admin');

create policy "users_update_admin" on public.users for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

grant update (role, status) on public.users to authenticated;

-- last_login_at já existia na coluna (schema original) mas nunca era escrita
-- — login não atualizava. Adicionada ao GRANT de auto-edição (mesmo grupo de
-- name/phone) pra cada usuário conseguir registrar o próprio login.
grant update (last_login_at) on public.users to authenticated;
