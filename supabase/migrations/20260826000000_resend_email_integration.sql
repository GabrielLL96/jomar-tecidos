-- ============================================================================
-- RESEND_SETTINGS
-- Linha única (id fixo) com a config do Resend (e-mail transacional).
-- Mesmo padrão de GRANT em duas camadas já usado em asaas_settings/
-- melhor_envio_settings: colunas de config são graváveis por admin
-- autenticado mas api_key NUNCA é legível de volta pelo client; connected_at/
-- connected_by só o service_role grava, depois de validar a chave de verdade
-- contra a API do Resend (ver Edge Function resend-validate-connection).
--
-- Resend não tem conceito de sandbox/produção (diferente da Asaas) — só uma
-- API key real por conta, então não existe coluna `environment` aqui.
-- ============================================================================

create table public.resend_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000003',
  api_key text,
  from_email text,
  from_name text,
  contact_notification_email text,
  connected_at timestamptz,
  connected_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint resend_settings_singleton check (id = '00000000-0000-0000-0000-000000000003')
);

create trigger resend_settings_handle_updated_at
  before update on public.resend_settings
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.resend_settings enable row level security;

create policy "resend_settings_admin_only" on public.resend_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- SELECT: nunca inclui api_key — só o que a tela de Configurações precisa
-- pra mostrar status de conexão e os campos de remetente/destino.
grant select (id, from_email, from_name, contact_notification_email, connected_at, connected_by, updated_at)
  on public.resend_settings to authenticated;

-- INSERT/UPDATE: admin escreve config + api_key. connected_at/connected_by
-- ficam de fora de propósito — só service_role (Edge Function
-- resend-validate-connection) grava, depois de confirmar a chave contra a
-- API real do Resend.
grant insert (id, api_key, from_email, from_name, contact_notification_email) on public.resend_settings to authenticated;
grant update (api_key, from_email, from_name, contact_notification_email) on public.resend_settings to authenticated;

-- service_role (Edge Functions) precisa ler api_key/from_email/from_name pra
-- enviar e-mail de verdade, e escrever connected_at/connected_by no sucesso
-- da validação. Mesmo achado já documentado várias vezes: service_role NÃO
-- faz bypass automático de GRANT/RLS neste projeto.
grant select, update on public.resend_settings to service_role;

create or replace function public.resend_secrets_configured()
returns table (api_key_configured boolean, from_email_configured boolean)
language sql
stable
security definer set search_path = public
as $$
  select
    api_key is not null and api_key != '',
    from_email is not null and from_email != ''
  from public.resend_settings
  where id = '00000000-0000-0000-0000-000000000003';
$$;

-- Linha singleton semeada aqui (como owner da migration, sem passar por
-- RLS/GRANT) — o client nunca precisa de upsert, só UPDATE puro.
insert into public.resend_settings (id)
values ('00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ============================================================================
-- integration_logs ganha 'resend' como integração válida. Toda chamada real
-- ao Resend (confirmação de pedido, mudança de status, contato) passa pelo
-- mesmo logIntegrationCall() já usado por Asaas/Melhor Envio.
-- Precisa dropar e recriar o check constraint (não dá pra "adicionar valor"
-- num check textual como se faz com enum via `alter type ... add value`).
-- ============================================================================

alter table public.integration_logs drop constraint integration_logs_integration_check;
alter table public.integration_logs add constraint integration_logs_integration_check
  check (integration in ('asaas', 'melhor_envio', 'resend'));

-- environment é not null no schema original (pensado pra Asaas/Melhor Envio,
-- que têm sandbox real) — Resend não tem esse conceito. Reaproveita
-- 'production' como valor fixo pras chamadas de e-mail em vez de abrir mão da
-- constraint NOT NULL só por causa de uma integração sem esse eixo.

-- ============================================================================
-- Rate limit por IP pro formulário de contato (visitante anônimo, sem
-- user_id). Tabela e function SEPARADAS de rate_limit_attempts/
-- check_and_record_rate_limit (uuid-based, usado pelos endpoints de
-- pagamento) — mudar o parâmetro de uuid pra text ali exigiria dropar uma
-- function usada em código crítico de cobrança sem necessidade nenhuma;
-- mais seguro isolar o rate-limit anônimo (formulário de contato, sem
-- dinheiro envolvido) na sua própria tabela/function.
-- ============================================================================

create table public.rate_limit_attempts_anon (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_anon_lookup_idx on public.rate_limit_attempts_anon (identifier, endpoint, created_at);

alter table public.rate_limit_attempts_anon enable row level security;
grant select, insert, delete on public.rate_limit_attempts_anon to service_role;

create or replace function public.check_and_record_rate_limit_by_ip(
  p_identifier text,
  p_endpoint text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_attempts_anon where created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.rate_limit_attempts_anon
  where rate_limit_attempts_anon.identifier = p_identifier
    and rate_limit_attempts_anon.endpoint = p_endpoint
    and rate_limit_attempts_anon.created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_attempts_anon (identifier, endpoint) values (p_identifier, p_endpoint);
  return true;
end;
$$;

grant execute on function public.check_and_record_rate_limit_by_ip(text, text, integer, integer) to service_role;
