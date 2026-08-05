-- Prepara o schema pra sair do mock local (loja + admin passam a ler/escrever
-- em public.products/compositions/... de verdade). Dois gaps reais impediam isso:
--
-- 1. products não tinha `slug` (usado na rota /tecidos/:slug) nem
--    `category_slug` (categoria de navegação, ADR-004 documenta que ela
--    convive separada de compositions no modelo mock — nunca foi replicada
--    pro schema real). Tabela está vazia (nunca foi escrita), então dá pra
--    adicionar como NOT NULL sem precisar de default/backfill.
--
-- 2. Mesma lacuna já corrigida em public.users (20260805000000) existe nas
--    outras 8 tabelas envolvidas: todas têm RLS + policies, mas nenhuma tem
--    GRANT pro role authenticated/anon — toda query real falharia com
--    "permission denied for table ..." (42501) antes da RLS ser avaliada.

alter table public.products add column slug text not null unique;
alter table public.products add column category_slug text not null;

-- Leitura pública (RLS já restringe onde precisa; GRANT é a camada que faltava)
grant select on
  public.products,
  public.compositions,
  public.product_compositions,
  public.product_colors,
  public.product_images,
  public.reviews,
  public.coupons
to anon, authenticated;

-- Escrita de catálogo — RLS (current_user_role() in admin/vendas/estoque, ou
-- admin puro pra coupons) segue sendo a autoridade real; GRANT só destrava a
-- camada de tabela.
grant insert, update, delete on
  public.products,
  public.compositions,
  public.product_compositions,
  public.product_colors,
  public.product_images,
  public.coupons
to authenticated;

-- reviews: só insert (reviews_insert_own exige auth.uid() = user_id; não há
-- policy de update/delete hoje).
grant insert on public.reviews to authenticated;

-- addresses: CRUD completo, RLS (addresses_*_own) restringe tudo a auth.uid() = user_id.
grant select, insert, update, delete on public.addresses to authenticated;
