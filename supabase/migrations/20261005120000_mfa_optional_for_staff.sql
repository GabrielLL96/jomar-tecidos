-- MFA (TOTP) de staff passa a ser OPCIONAL (opt-in no perfil do admin).
--
-- Antes (20261002150000): role <> 'customer' só valia com sessão aal2, então
-- todo staff era obrigado a cadastrar TOTP no primeiro login — o fluxo do
-- admin travava até concluir o cadastro.
--
-- Agora: staff SEM fator TOTP verificado exerce o role com sessão aal1 (só
-- senha). Staff COM fator verificado continua precisando de aal2 — senão
-- quem tivesse só a senha de um admin que ativou MFA pularia o desafio e o
-- MFA viraria decoração.
--
-- Mantido de 20261002150000: fallback 'customer' em vez de NULL (fecha
-- delete_order() chamável por anon).
--
-- create or replace preserva os GRANTs existentes da function. Security
-- definer (owner postgres) é o que permite ler auth.mfa_factors.

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
        when not exists (
          select 1
          from auth.mfa_factors f
          where f.user_id = u.id
            and f.status = 'verified'
        ) then u.role
        else 'customer'::public.user_role
      end
      from public.users u
      where u.id = auth.uid()
    ),
    'customer'::public.user_role
  );
$$;
