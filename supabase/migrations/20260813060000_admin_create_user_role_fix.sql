-- Correção de achado real: a migration anterior (20260813050000) tentou ler
-- `raw_app_meta_data ->> 'role'` dentro de handle_new_user() (trigger AFTER
-- INSERT on auth.users), assumindo que a Admin API já teria gravado
-- app_metadata completo no momento do INSERT que dispara o trigger.
--
-- Testado de verdade contra o projeto real: NÃO é o caso. Criei um usuário
-- via auth.admin.createUser({ app_metadata: { role: 'admin' } }) e o
-- registro final em auth.users.raw_app_meta_data ficou correto
-- ({"role":"admin",...}), mas public.users.role ficou 'customer' — ou seja,
-- o GoTrue popula app_metadata numa operação separada (provavelmente um
-- UPDATE) DEPOIS do INSERT base que o trigger AFTER INSERT captura. A
-- expressão CASE em si funciona (testada isolada), só o timing do dado
-- dentro do trigger está errado. Não há como contornar isso só com um
-- trigger AFTER INSERT.
--
-- Volta pra abordagem "criar sempre como customer (default da coluna) + a
-- Edge Function faz um UPDATE explícito pra 'admin' logo depois de
-- auth.admin.createUser() confirmar sucesso, quando aplicável" — usa o
-- app_metadata retornado na RESPOSTA da Admin API (que já está completo
-- nesse ponto), não o que o trigger via durante o INSERT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, cpf, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );

  if new.raw_user_meta_data ->> 'street' is not null then
    insert into public.addresses (user_id, label, street, city, state, zip_code, is_default)
    values (
      new.id,
      'Principal',
      new.raw_user_meta_data ->> 'street',
      new.raw_user_meta_data ->> 'city',
      new.raw_user_meta_data ->> 'state',
      new.raw_user_meta_data ->> 'zip_code',
      true
    );
  end if;

  return new;
end;
$$;

-- admin-create-user (Edge Function) precisa desse GRANT pro UPDATE
-- pós-criação funcionar — service_role não tem bypass automático de GRANT
-- via PostgREST nesse projeto (achado já documentado em
-- 20260810140000_grant_service_role_edge_functions.sql). Escopo mínimo: só
-- a coluna role, só o necessário pra esse fluxo.
grant update (role) on public.users to service_role;
