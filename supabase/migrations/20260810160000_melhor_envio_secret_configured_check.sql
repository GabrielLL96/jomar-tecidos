-- ============================================================================
-- Function security definer (mesmo padrão de current_user_role()) que
-- devolve só um boolean — "o client_secret está preenchido?" — sem nunca
-- expor o valor em si. GRANT de coluna em melhor_envio_settings (migration
-- 20260810120000) já bloqueia authenticated de ler client_secret direto;
-- essa function é o jeito seguro de responder "está configurado?" na UI
-- sem reabrir SELECT na coluna protegida.
-- ============================================================================

create or replace function public.melhor_envio_secret_configured()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select client_secret is not null and client_secret != ''
  from public.melhor_envio_settings
  where id = '00000000-0000-0000-0000-000000000001';
$$;
