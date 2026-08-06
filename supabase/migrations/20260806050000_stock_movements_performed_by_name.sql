-- users_select_own (RLS) só permite ler o próprio registro (auth.uid() = id)
-- — um join stock_movements.user_id -> users(name) nunca resolveria o nome de
-- OUTRO funcionário pra quem está vendo o histórico, só o do próprio usuário
-- logado. Abrir a RLS de users pra staff geral ler nomes alheios é decisão
-- maior (visibilidade entre funcionários), fora do escopo desta feature.
--
-- Fix: snapshot do nome de quem fez o ajuste, gravado na hora — padrão comum
-- de log de auditoria (também imune a rename de usuário depois). user_id
-- continua existindo pra integridade referencial, mas a exibição usa esta
-- coluna, não um join.
alter table public.stock_movements
  add column if not exists performed_by_name text not null default 'Desconhecido';
alter table public.stock_movements alter column performed_by_name drop default;
