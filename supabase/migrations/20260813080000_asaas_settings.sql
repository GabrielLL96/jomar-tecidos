-- ============================================================================
-- ASAAS_SETTINGS
-- Linha única (id fixo) com a config da integração Asaas (gateway de
-- pagamento, sandbox por enquanto). Diferente da Melhor Envio, a Asaas não
-- usa OAuth — autenticação é por API key estática (header `access_token`,
-- ver docs.asaas.com/docs/authentication) — então não há access_token/
-- refresh_token pra guardar, só a própria api_key.
--
-- Mesmo padrão de GRANT em duas camadas já usado em melhor_envio_settings
-- (20260810120000): colunas de config (environment/api_key/webhook_token)
-- são graváveis por admin autenticado mas NUNCA legíveis de volta pelo
-- client; connected_at/connected_by só o service_role (Edge Function) grava,
-- depois de validar a chave de verdade contra a API da Asaas.
-- ============================================================================

create table public.asaas_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000002',
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  api_key text,
  webhook_token text,
  connected_at timestamptz,
  connected_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint asaas_settings_singleton check (id = '00000000-0000-0000-0000-000000000002')
);

create trigger asaas_settings_handle_updated_at
  before update on public.asaas_settings
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.asaas_settings enable row level security;

create policy "asaas_settings_admin_only" on public.asaas_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- SELECT: nunca inclui api_key/webhook_token — só o que a tela de
-- Configurações precisa pra mostrar status de conexão.
grant select (id, environment, connected_at, connected_by, updated_at)
  on public.asaas_settings to authenticated;

-- INSERT/UPDATE: admin só escreve a config do app. connected_at/connected_by
-- ficam de fora de propósito — só service_role (Edge Function
-- asaas-validate-connection) grava, depois de confirmar a chave contra a API
-- real da Asaas.
grant insert (id, environment, api_key, webhook_token) on public.asaas_settings to authenticated;
grant update (environment, api_key, webhook_token) on public.asaas_settings to authenticated;

-- service_role (Edge Functions) precisa ler api_key/webhook_token pra
-- chamar a Asaas e validar webhooks recebidos, e escrever connected_at/
-- connected_by no sucesso da validação. Mesmo achado já documentado em
-- 20260810140000: service_role NÃO faz bypass automático de GRANT/RLS
-- neste projeto — precisa de GRANT explícito igual authenticated/anon.
grant select, update on public.asaas_settings to service_role;

-- Function security definer (mesmo padrão de melhor_envio_secret_configured,
-- 20260810160000) — devolve só booleans, nunca o valor dos secrets em si.
create or replace function public.asaas_secrets_configured()
returns table (api_key_configured boolean, webhook_token_configured boolean)
language sql
stable
security definer set search_path = public
as $$
  select
    api_key is not null and api_key != '',
    webhook_token is not null and webhook_token != ''
  from public.asaas_settings
  where id = '00000000-0000-0000-0000-000000000002';
$$;

-- Linha singleton semeada aqui (como owner da migration, sem passar por
-- RLS/GRANT) — o client nunca precisa de upsert, só UPDATE puro, que não
-- exige SELECT nenhum do chamador (mesmo raciocínio de 20260810130100).
insert into public.asaas_settings (id)
values ('00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;
