-- Endurece products_public_read: draft deixa de ser legível via API direta
-- para quem não é staff. Frontend já filtra status <> 'draft' em listagem
-- (productsQueryOptions) e detalhe (productQueryOptions) desde ADR-007 — RLS
-- usando (true) permitia bypass por REST direta (fetch cru na anon key).
--
-- Staff (admin/vendas/estoque) precisa continuar enxergando draft: é assim
-- que AdminProductsPage / useAdminProducts() mostra produto inativado (ADR-007
-- reaproveita status='draft' como soft-delete) — sem essa exceção, o botão
-- "Ativar" ficaria inacessível depois de inativar.
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select
  using (
    status <> 'draft'
    or public.current_user_role() in ('admin', 'vendas', 'estoque')
  );
