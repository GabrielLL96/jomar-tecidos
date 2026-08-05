-- Semeia as 7 avaliações e os 3 cupons que existiam só no fixture mock.
-- Rodado como migration (privilégio elevado) porque:
-- - Não existe tela de Avaliações/Cupons no admin ainda (só Dashboard+Produtos).
-- - reviews_insert_own exige auth.uid() = user_id; essas avaliações de
--   demonstração não têm usuário real por trás (user_id fica null), o que
--   nunca passaria pela RLS via client SDK autenticado.
-- Produtos referenciados por sku (não por uuid fixo) porque os 9 produtos
-- foram criados agora pela UI do admin, com id gerado pelo Postgres.

insert into public.reviews (product_id, author_name, rating, text, created_at)
select p.id, r.author_name, r.rating, r.text, r.created_at::timestamptz
from (
  values
    ('LIN-BELG-001', 'Marina C.', 5, 'Tecido encorpado, exatamente como descrito. Usei pra estofar uma poltrona e ficou lindo.', '2026-06-14'),
    ('LIN-BELG-001', 'Roberto A.', 4, 'Boa qualidade, só achei o prazo de entrega um pouco apertado.', '2026-07-02'),
    ('SED-CHAR-003', 'Fernanda L.', 5, 'Caimento perfeito para o vestido que eu queria fazer. Brilho lindo.', '2026-05-20'),
    ('AVI-VELU-006', 'Juliana P.', 5, 'Veludo maravilhoso, toque muito macio e cor fiel à foto.', '2026-04-11'),
    ('AVI-VELU-006', 'Carlos E.', 4, 'Bom custo-benefício para estofar as almofadas da sala.', '2026-05-30'),
    ('AVI-VELU-006', 'Beatriz S.', 3, 'Gostei da textura, mas esperava um pouco mais de cobertura de cor.', '2026-06-25'),
    ('REN-GUIP-009', 'Helena M.', 5, 'Renda delicada e muito bem acabada, usei no enxoval do meu bebê.', '2026-07-10')
) as r(sku, author_name, rating, text, created_at)
join public.products p on p.sku = r.sku;

insert into public.coupons (code, type, value, max_uses, used_count, expires_at, status) values
  ('BEMVINDO10', 'percentage', 10, null, 34, null, 'active'),
  ('FRETEGRATIS', 'free_shipping', 0, null, 12, null, 'active'),
  ('PROMOJULHO', 'fixed', 20, 50, 50, '2026-07-31T23:59:59-03:00', 'expired');
