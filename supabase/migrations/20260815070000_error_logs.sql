-- ============================================================================
-- error_logs: captura de erro em runtime (JS não tratado, promise rejeitada,
-- crash de render) — diferente de activity_logs (que só registra ESCRITA
-- BEM-SUCEDIDA nas tabelas de negócio). Pedido do usuário depois de perguntar
-- se a auditoria de activity_logs "pega bug que ocorre" — resposta foi não
-- (trigger AFTER só dispara em operação já confirmada), então isso é uma
-- ferramenta nova e complementar, não uma extensão da auditoria existente.
--
-- Decisão: tabela própria no Supabase (não Sentry/APM externo) — sem conta de
-- terceiro, sem DSN em variável de ambiente de produção, sem risco de PII
-- vazar pra um serviço fora do projeto. Trade-off aceito: sem stack trace
-- deminificado (sourcemap), sem alerta automático — é preciso abrir a tela
-- pra descobrir que algo quebrou.
-- ============================================================================

create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  user_email text,
  message text not null check (char_length(message) <= 2000),
  stack text check (stack is null or char_length(stack) <= 8000),
  source text not null check (source in ('window', 'unhandledrejection', 'react-error-boundary')),
  url text check (url is null or char_length(url) <= 2000),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  context jsonb,
  created_at timestamptz not null default now()
);

create index error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

-- Leitura: admin-only, mesmo padrão de activity_logs.
create policy "error_logs_select_admin" on public.error_logs for select
  using (public.current_user_role() = 'admin');

-- Escrita: qualquer visitante — logado ou não — pode reportar um erro que
-- aconteceu no PRÓPRIO navegador dele. Um bug não espera o visitante estar
-- autenticado pra acontecer (ex.: erro na home ou na PDP pra quem nunca fez
-- login). RLS restringe a INSERT puro (with check true) — sem select/update/
-- delete pra ninguém além de admin, então mesmo que alguém insira lixo, não
-- consegue ler de volta nem alterar o que já está lá. Sem rate limit
-- dedicado (existe infra pra isso desde hoje, rate_limit.sql, mas foi
-- construída pra bloquear fraude de cartão — abuso aqui é bem menos grave,
-- CHECK de tamanho de coluna já limita o dano de um insert isolado).
create policy "error_logs_insert_anyone" on public.error_logs for insert
  with check (true);

grant select on public.error_logs to authenticated;
grant insert on public.error_logs to anon, authenticated;
