-- A migration anterior (20260805130000) juntava avaliações a produtos por
-- `sku`, mas o modal do admin gera um SKU aleatório (`ADM-XXXXXXXX`) em vez
-- de aceitar o SKU original do mock — o join não bateu com nada e o insert
-- rodou silenciosamente com 0 linhas (sem erro, só um SELECT vazio). `slug`
-- é gerado a partir do nome do produto tanto no fixture antigo quanto no
-- modal do admin (mesma função de slugify), então ele sim é estável — usado
-- aqui em vez de sku.

insert into public.reviews (product_id, author_name, rating, text, created_at)
select p.id, r.author_name, r.rating, r.text, r.created_at::timestamptz
from (
  values
    ('linho-belga-natural', 'Marina C.', 5, 'Tecido encorpado, exatamente como descrito. Usei pra estofar uma poltrona e ficou lindo.', '2026-06-14'),
    ('linho-belga-natural', 'Roberto A.', 4, 'Boa qualidade, só achei o prazo de entrega um pouco apertado.', '2026-07-02'),
    ('seda-pura-charmeuse', 'Fernanda L.', 5, 'Caimento perfeito para o vestido que eu queria fazer. Brilho lindo.', '2026-05-20'),
    ('veludo-molhado-encorpado', 'Juliana P.', 5, 'Veludo maravilhoso, toque muito macio e cor fiel à foto.', '2026-04-11'),
    ('veludo-molhado-encorpado', 'Carlos E.', 4, 'Bom custo-benefício para estofar as almofadas da sala.', '2026-05-30'),
    ('veludo-molhado-encorpado', 'Beatriz S.', 3, 'Gostei da textura, mas esperava um pouco mais de cobertura de cor.', '2026-06-25'),
    ('renda-guipure-branca', 'Helena M.', 5, 'Renda delicada e muito bem acabada, usei no enxoval do meu bebê.', '2026-07-10')
) as r(slug, author_name, rating, text, created_at)
join public.products p on p.slug = r.slug
where not exists (
  select 1 from public.reviews existing
  where existing.product_id = p.id and existing.author_name = r.author_name and existing.text = r.text
);
