-- Tela de Estoque (/admin/estoque): precisa de estoque mínimo por produto
-- (conceito diferente de min_sale_meters, que é a quantidade mínima POR VENDA,
-- não o limiar de "estoque baixo") e um log estruturado de entrada/saída.
--
-- activity_logs já existe no schema desde a spec original mas nunca foi usado
-- em lugar nenhum do app — é texto livre (action/details), não dá pra filtrar
-- ou somar por produto+quantidade de forma confiável. stock_movements é a
-- tabela estruturada de verdade pro histórico de estoque.
--
-- NÃO conectamos o ajuste de estoque a activity_logs: a policy dessa tabela
-- é admin-only de verdade (current_user_role() = 'admin', não staff geral,
-- ver 20260803120000_initial_schema.sql linha ~439) — um usuário
-- vendas/estoque registrando um ajuste tomaria erro de permissão silencioso
-- ao tentar logar lá. Mudar essa RLS seria decisão de outra feature (o
-- "Log de atividades" do admin, ainda não construído), não efeito colateral
-- desta migration. GRANT abaixo corrigido por consistência (mesma lacuna já
-- vista 3x nesse projeto), mas o fluxo de estoque não escreve nela.
alter table public.products
  add column if not exists min_stock_meters numeric(10, 2) not null default 0 check (min_stock_meters >= 0);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  -- positivo = entrada, negativo = saída — um único campo carrega o sinal em
  -- vez de type enum + quantidade sem sinal, evita inconsistência entre os dois.
  quantity numeric(10, 2) not null check (quantity <> 0),
  reason text not null,
  user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_product_id_idx on public.stock_movements (product_id);

alter table public.stock_movements enable row level security;

create policy "stock_movements_staff" on public.stock_movements for all
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));

grant select, insert, update, delete on public.stock_movements to authenticated;
grant usage on schema public to authenticated;

-- Mesma lacuna de GRANT já corrigida 3x nesse projeto (users, catálogo,
-- site_settings) — RLS "admin_only" existia desde o schema original, mas sem
-- GRANT nenhuma escrita/leitura funcionaria pro role authenticated.
grant select, insert, update, delete on public.activity_logs to authenticated;
