-- Storage real pra imagens (produto + conteúdo da home) e curadoria manual de
-- destaques (ver ADR: "mais vendidos" não pode ser calculado de vendas reais
-- porque pedidos seguem mockados, ADR-002 — vira seleção manual via flag).
--
-- GRANT em storage.objects/storage.buckets já existe por padrão no projeto
-- (confirmado via `supabase db query --linked` antes desta migration — anon e
-- authenticated já têm INSERT/SELECT/UPDATE/DELETE de tabela); RLS abaixo é a
-- única camada de autorização real que falta, igual ao padrão já usado nas
-- tabelas de catálogo.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('site-images', 'site-images', true)
on conflict (id) do nothing;

create policy "product_images_bucket_public_read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product_images_bucket_write_staff" on storage.objects for all
  using (bucket_id = 'product-images' and public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (bucket_id = 'product-images' and public.current_user_role() in ('admin', 'vendas', 'estoque'));

create policy "site_images_bucket_public_read" on storage.objects for select
  using (bucket_id = 'site-images');
create policy "site_images_bucket_write_admin" on storage.objects for all
  using (bucket_id = 'site-images' and public.current_user_role() = 'admin')
  with check (bucket_id = 'site-images' and public.current_user_role() = 'admin');

-- "Mais vendidos" na Home: seleção manual (staff marca), não cálculo de
-- vendas reais — pedidos continuam mockados (ADR-002). "Produtos novos"
-- reaproveita a coluna `tag` já existente, sem migration nova.
alter table public.products add column is_bestseller boolean not null default false;
