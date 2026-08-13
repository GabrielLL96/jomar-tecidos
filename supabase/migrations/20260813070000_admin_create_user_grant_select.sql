-- Achado real, reproduzido direto contra o banco: `grant update (role) on
-- public.users to service_role` (migration anterior) não foi suficiente —
-- o UPDATE via PostgREST (supabase-js) sempre tenta um RETURNING implícito,
-- que exige SELECT na tabela também. Sem isso, o erro é
-- "42501 permission denied for table users" (não menciona a coluna, o que
-- inicialmente pareceu ser falta do GRANT de UPDATE — não era). Confirmado
-- rodando a mesma query com `set role service_role` direto no banco: o HINT
-- do próprio Postgres apontou exatamente esse GRANT faltando.
grant select on public.users to service_role;
