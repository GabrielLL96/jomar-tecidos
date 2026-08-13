-- Criação de usuário via admin (Edge Function admin-create-user) precisa
-- gravar `role` já no INSERT em public.users, não num UPDATE separado depois
-- (que exigiria GRANT novo e permanente pro service_role, e deixaria uma
-- janela de "customer criado, promoção pendente" precisando de rollback
-- manual em caso de falha). Em vez disso, o role vem via `app_metadata` do
-- `auth.admin.createUser()` — só a Admin API (service_role) consegue setar
-- isso; `supabase.auth.signUp()` público não aceita `app_metadata`, só
-- `options.data` (que vira `raw_user_meta_data`, campo diferente). Ou seja,
-- ler `raw_app_meta_data ->> 'role'` aqui não abre nenhum vetor de
-- escalação via signup público — confirmado no código do supabase-js
-- (SignUpWithPasswordCredentials não tem esse campo).
--
-- Allowlist explícita via CASE (nunca cast direto de um valor arbitrário)
-- — um valor inesperado em raw_app_meta_data não pode derrubar o signup
-- público inteiro, já que essa function roda pra TODO insert em auth.users.
-- Só 'admin' é aceito aqui (não os outros 4 staff roles) — bate com o
-- escopo pedido (2 fluxos: usuário comum/admin); vendas/estoque/marketing/
-- suporte continuam só atribuíveis depois via o modal de Editar já
-- existente, sem mudança nele.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, cpf, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case new.raw_app_meta_data ->> 'role'
      when 'admin' then 'admin'::public.user_role
      else 'customer'::public.user_role
    end
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
