-- Pré-requisito pra geração de etiqueta de envio (Melhor Envio Fase 2, spec
-- separado): CPF/telefone do destinatário provavelmente são exigidos pela API
-- real. Checkout hoje não coleta isso — passa a ser coletado no cadastro (ver
-- spec 2026-08-13-checkout-identificacao-forcada-design.md).
alter table public.users add column cpf text unique;

-- Mesma assinatura de sempre (função de trigger, sem parâmetros explícitos) —
-- create or replace substitui de verdade, sem o risco de overload já achado
-- na correção anterior de create_order(). Passa a ler cpf/phone/endereço de
-- raw_user_meta_data (mesmo mecanismo que `name` já usava) e cria o endereço
-- padrão do cliente, se vier preenchido — tudo atômico dentro do trigger
-- (security definer), independente de haver sessão ativa depois (resolve o
-- caso de confirmação de e-mail pendente: o client não teria auth.uid() pra
-- escrever em users/addresses direto nesse meio-tempo).
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
