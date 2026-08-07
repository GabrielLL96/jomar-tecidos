-- Achado testando o checkout real: criar a sequence (20260807000000) não
-- libera uso automático pra outros roles — o default da coluna chama
-- nextval() com o privilégio de quem está inserindo (authenticated), não do
-- dono da sequence. Sem esse GRANT, todo insert em orders falhava com
-- "permission denied for sequence order_number_seq".
grant usage, select on sequence public.order_number_seq to authenticated;
