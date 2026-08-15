-- Rate limiting server-side pras Edge Functions de pagamento — achado real da
-- auditoria LGPD (docs/lgpd/auditoria-2026-08-15.md, item de Prioridade Alta
-- #2): asaas-charge-card não tinha limite nenhum de tentativas, abrindo
-- espaço pra teste de cartão em massa (card testing fraud) além do risco de
-- LGPD puro (scraping/abuso de endpoint que trata dado pessoal).
--
-- Tabela simples (não é feature de produto, é controle interno) — Edge
-- Functions são stateless, precisa de algo persistente. Função
-- security definer com GRANT só pro service_role: um client comum nunca
-- pode chamar isso direto (senão burlaria o próprio limite inserindo linhas
-- fantasma ou zerando a contagem de outro jeito).
create table public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx on public.rate_limit_attempts (user_id, endpoint, created_at);

-- RLS ligada sem nenhuma policy pra authenticated/anon — só service_role
-- (que não passa por RLS neste projeto sem GRANT explícito, mesmo achado já
-- documentado várias vezes) consegue tocar a tabela.
alter table public.rate_limit_attempts enable row level security;
grant select, insert, delete on public.rate_limit_attempts to service_role;

create or replace function public.check_and_record_rate_limit(
  p_user_id uuid,
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
  -- limpeza oportunista (sem cron novo) — evita crescimento sem fim da
  -- tabela, uma linha de manutenção a cada chamada é barato o bastante
  delete from public.rate_limit_attempts where created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.rate_limit_attempts
  where rate_limit_attempts.user_id = p_user_id
    and rate_limit_attempts.endpoint = p_endpoint
    and rate_limit_attempts.created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_attempts (user_id, endpoint) values (p_user_id, p_endpoint);
  return true;
end;
$$;

grant execute on function public.check_and_record_rate_limit(uuid, text, integer, integer) to service_role;
