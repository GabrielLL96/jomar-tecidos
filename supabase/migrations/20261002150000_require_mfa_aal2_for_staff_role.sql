-- MFA (TOTP) obrigatório pra staff, com enforcement no banco.
--
-- current_user_role() é o ÚNICO ponto de decisão de privilégio de staff do
-- schema: todas as policies (tabelas + storage) e RPCs security definer que
-- liberam algo pra staff passam por ela, e as Edge Functions admin
-- (requireAdmin em _shared/melhor-envio.ts) chamam a mesma function via RPC
-- com o JWT do chamador. Grep de 2026-10-02 não achou checagem de role do
-- CHAMADOR inline em nenhum outro lugar (a única leitura bruta de
-- users.role em policy é o guard anti-escalação de users_update_own, que
-- só RESTRINGE — não concede nada).
--
-- Mudança 1 — aal2: role diferente de 'customer' só vale quando o JWT da
-- sessão é aal2 (fator TOTP verificado nesta sessão). Sessão aal1 de staff
-- é tratada como 'customer' — continua conseguindo ler o próprio registro
-- (users_select_own usa auth.uid(), não esta function), então o front sabe
-- que o usuário é staff e manda pro cadastro/desafio de MFA. O enroll/
-- challenge/verify é GoTrue puro, não passa por RLS de tabela pública.
--
-- "Staff" = qualquer role <> 'customer' (inclui marketing/suporte, que têm
-- leitura de staff em policy do schema inicial) — não só admin/vendas/estoque.
--
-- Mudança 2 — nunca NULL: sem linha em public.users (anon, service_role,
-- usuário órfão) a function devolvia NULL, e `if current_user_role() not in
-- ('admin','vendas') then raise` em delete_order() vira `if null` → NÃO
-- levanta exceção. delete_order é executável por anon (grant default do
-- Supabase pra functions em public), então anon conseguia soft-deletar
-- pedido não pago sabendo o uuid. Devolver 'customer' fecha essa classe de
-- bug. Nenhum ponto do schema/edge testa `current_user_role() is null`
-- (grep de 2026-10-02); policies `in (...)` dão o mesmo resultado (falso).
--
-- create or replace preserva os GRANTs existentes da function. Corpo
-- anterior: 20260803120000_initial_schema.sql (única definição até aqui).

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (
      select case
        when u.role = 'customer' then u.role
        when coalesce(auth.jwt() ->> 'aal', '') = 'aal2' then u.role
        else 'customer'::public.user_role
      end
      from public.users u
      where u.id = auth.uid()
    ),
    'customer'::public.user_role
  );
$$;
