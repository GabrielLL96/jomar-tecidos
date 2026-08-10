-- ============================================================================
-- MELHOR_ENVIO_SETTINGS
-- Linha única (id fixo) com a config da integração OAuth Melhor Envio e o
-- estado da conexão. GRANT em duas camadas, mesmo padrão já usado em
-- public.users.role (20260805000000): colunas de config (client_id/
-- client_secret/redirect_uri) são graváveis/legíveis por admin autenticado;
-- colunas de conexão (access_token/refresh_token/token_expires_at/
-- connected_at/connected_by) só o service_role (Edge Function) grava — nunca
-- aparecem no GRANT de authenticated, então o token real nunca volta pro
-- frontend, nem por engano.
-- ============================================================================

create table public.melhor_envio_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  client_id text,
  client_secret text,
  redirect_uri text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  connected_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint melhor_envio_settings_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

create trigger melhor_envio_settings_handle_updated_at
  before update on public.melhor_envio_settings
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.melhor_envio_settings enable row level security;

create policy "melhor_envio_settings_admin_only" on public.melhor_envio_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- SELECT: nunca inclui client_secret/access_token/refresh_token — só o que a
-- tela de Configurações precisa pra mostrar status de conexão.
grant select (id, client_id, redirect_uri, connected_at, connected_by, token_expires_at, updated_at)
  on public.melhor_envio_settings to authenticated;

-- INSERT/UPDATE: admin só escreve a config do app (client_id/client_secret/
-- redirect_uri). Colunas de conexão ficam de fora de propósito — só
-- service_role (Edge Function) grava access_token/refresh_token/
-- token_expires_at/connected_at/connected_by.
grant insert (id, client_id, client_secret, redirect_uri) on public.melhor_envio_settings to authenticated;
grant update (client_id, client_secret, redirect_uri) on public.melhor_envio_settings to authenticated;
