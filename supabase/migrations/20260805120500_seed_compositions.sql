-- public.compositions.id é uuid gerado pelo Postgres, não os slugs estáveis
-- ('linhos', 'algodao-egipcio'...) que o fixture mock usava como id. Sem
-- depender de produto (nenhuma FK nessa direção), dá pra semear já — o
-- client passa a resolver esses nomes via query em vez de import estático.

insert into public.compositions (name) values
  ('Linhos'),
  ('Algodões'),
  ('Sedas'),
  ('Aviamentos'),
  ('Rendas'),
  ('Algodão Egípcio'),
  ('Poliéster'),
  ('Nylon');
