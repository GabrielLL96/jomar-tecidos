-- users_update_own permitia auth.uid() = id sem checar QUAIS colunas mudavam.
-- Como policies permissivas do mesmo comando se combinam com OR, e a coluna
-- role/status tem GRANT liberado pra authenticated (pro admin trocar role de
-- outros usuários via AdminUserDetailPage), QUALQUER cliente logado
-- conseguia se promover a admin com um único
-- `supabase.from('users').update({ role: 'admin' }).eq('id', session.user.id)`
-- no console do navegador — sem precisar de nenhum acesso especial. Verificado
-- ao vivo (com rollback) antes deste fix.
--
-- Fix: with_check agora exige que role/status permaneçam iguais ao valor já
-- gravado quando quem edita é o próprio dono da linha. A policy
-- users_update_admin (current_user_role() = 'admin') continua liberando a
-- troca de role/status por um admin de verdade, sem essa restrição adicional.
drop policy "users_update_own" on public.users;
create policy "users_update_own" on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select u.role from public.users u where u.id = auth.uid())
    and status = (select u.status from public.users u where u.id = auth.uid())
  );
