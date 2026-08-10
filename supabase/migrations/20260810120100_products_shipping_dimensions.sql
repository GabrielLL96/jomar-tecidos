-- ============================================================================
-- PRODUCTS — peso/dimensão de embalagem, pra cotação real de frete (Melhor
-- Envio). Nullable de propósito: os produtos existentes na data desta
-- migration nascem com esses campos vazios (gap real, sem valor inventado) —
-- retrofit é tarefa manual do admin. Produto novo passa a exigir os 4 campos
-- via validação no formulário (AdminProductModal), não via NOT NULL aqui,
-- pra não travar a migration em produtos já cadastrados.
-- Sem RLS/GRANT novo: já cobertas pela policy de linha "products_write_staff"
-- existente (GRANT de tabela inteira, não por coluna).
-- ============================================================================

alter table public.products
  add column weight_grams integer check (weight_grams is null or weight_grams > 0),
  add column package_height_cm numeric(6, 2) check (package_height_cm is null or package_height_cm > 0),
  add column package_width_cm numeric(6, 2) check (package_width_cm is null or package_width_cm > 0),
  add column package_length_cm numeric(6, 2) check (package_length_cm is null or package_length_cm > 0);
