-- ============================================================================
-- Garante "só um endereço padrão por usuário" no servidor — até aqui não
-- havia nenhuma garantia disso, só a convenção do client (AddressesContext
-- marcava is_default=true só no primeiro endereço criado, nunca revertia os
-- outros). checkout.tsx já lê `addresses.find(a => a.isDefault)` pra
-- pré-selecionar o endereço — com dois "padrão" ao mesmo tempo, o resultado
-- vira dependente da ordem que o Postgres devolve as linhas, não uma escolha
-- real do cliente.
--
-- Trigger em vez de 2 updates sequenciais do client: marcar um endereço como
-- padrão sempre desmarca os outros do MESMO usuário, atômico, funciona
-- independente de quantos call sites decidirem setar is_default=true no
-- futuro (não só a tela de endereços).
-- ============================================================================

create or replace function public.fn_enforce_single_default_address()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_default then
    update public.addresses
    set is_default = false
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_single_default_address
  after insert or update of is_default on public.addresses
  for each row
  when (new.is_default)
  execute function public.fn_enforce_single_default_address();
