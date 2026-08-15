-- ============================================================================
-- Auditoria de escrita nas entidades principais — reconciliação com
-- public.activity_logs (já existente, admin-only, é a tabela que a tela "Log"
-- do mockup Claude Design desenha: Data/Hora, Usuário, Ação, Detalhes).
--
-- Decisão explícita: NÃO criar uma tabela audit_logs paralela. activity_logs
-- já cobre RLS admin-only e é o que a UI real vai consumir — só falta ganhar
-- as colunas de entidade/diff/status que faltavam pra virar auditoria de
-- verdade, e passar a ser escrita via trigger em vez de continuar sem
-- nenhum consumidor (ver ADR-010 do vault: "nunca teve consumidor").
--
-- Escopo deliberadamente menor que "toda tabela": products, orders,
-- order_items, users, compositions, coupons, deliveries. Ficam de fora
-- tabelas de junção/baixo valor de auditoria (product_images, product_colors,
-- product_compositions, reviews, wishlists, carts, cart_items) e
-- stock_movements/order_status_history (já são, elas mesmas, ledgers
-- imutáveis de auditoria — colocar trigger nelas seria auditar a auditoria).
--
-- Risco LGPD conhecido e aceito explicitamente pelo usuário (ver
-- docs/lgpd/plano-adequacao.md item 11/14, ainda sem prazo de retenção
-- definido): o trigger em `users` grava snapshot completo da linha em
-- dados_antes/dados_depois, com CPF mascarado (removido do jsonb) mas
-- nome/e-mail/telefone completos. Sem job de retenção — fica como pendência,
-- não resolvida aqui.
-- ============================================================================

alter table public.activity_logs
  add column entity text,
  add column entity_id uuid,
  add column data_before jsonb,
  add column data_after jsonb,
  add column ip_address text,
  add column user_agent text,
  add column status text not null default 'success',
  add column error_message text,
  add column user_email text;

comment on column public.activity_logs.action is
  'create | update | delete | login | logout | export — inglês, mesmo padrão de orders.status (rótulo PT-BR só no frontend)';
comment on column public.activity_logs.entity is
  'nome da tabela auditada (products, orders, users, etc.) — null pra login/logout';
comment on column public.activity_logs.status is 'success | failure';

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity, entity_id);

-- ============================================================================
-- Imutabilidade real: GRANT anterior (20260806040000_stock_movements.sql)
-- tinha aberto update/delete/insert pra `authenticated` — só a RLS
-- (role = 'admin') barrava, ou seja, o próprio admin conseguia editar/apagar
-- log. Revogado agora que a tabela passa a ser auditoria de verdade, não
-- "activity" solto. Único jeito de inserir passa a ser a function
-- security definer abaixo (roda como dono da function, não como
-- `authenticated` — não precisa de GRANT de insert pra ninguém).
-- ============================================================================
revoke insert, update, delete on public.activity_logs from authenticated;

-- ============================================================================
-- fn_audit_log(): trigger AFTER INSERT/UPDATE/DELETE genérico.
-- ============================================================================
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_user_email text;
begin
  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end;

  -- Mascarar CPF (dado sensível, LGPD — docs/lgpd/plano-adequacao.md item 14)
  -- na tabela users. Nenhuma outra tabela auditada guarda senha (fica em
  -- auth.users, fora do escopo deste trigger) ou dado de pagamento em texto
  -- plano (saved_credit_cards guarda só token + últimos 4 dígitos, e não
  -- está no escopo do trigger).
  if tg_table_name = 'users' then
    v_before := v_before - 'cpf';
    v_after := v_after - 'cpf';
  end if;

  select users.email into v_user_email from public.users where users.id = auth.uid();

  insert into public.activity_logs (
    user_id, user_email, action, entity, entity_id, data_before, data_after, details
  ) values (
    auth.uid(),
    v_user_email,
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    v_before,
    v_after,
    tg_table_name || ' ' || lower(tg_op)
  );

  return coalesce(new, old);
end;
$$;

-- Tabelas sem coluna "sensível a ruído" — trigger único cobre insert/update/delete.
create trigger trg_audit_products
  after insert or update or delete on public.products
  for each row execute function public.fn_audit_log();

create trigger trg_audit_orders
  after insert or update or delete on public.orders
  for each row execute function public.fn_audit_log();

create trigger trg_audit_order_items
  after insert or update or delete on public.order_items
  for each row execute function public.fn_audit_log();

create trigger trg_audit_compositions
  after insert or update or delete on public.compositions
  for each row execute function public.fn_audit_log();

create trigger trg_audit_coupons
  after insert or update or delete on public.coupons
  for each row execute function public.fn_audit_log();

create trigger trg_audit_deliveries
  after insert or update or delete on public.deliveries
  for each row execute function public.fn_audit_log();

-- users: separado em 3 triggers porque UPDATE precisa de WHEN — sem isso,
-- todo login geraria uma linha de auditoria "update users" só porque
-- AuthContext.login() grava last_login_at a cada login (achado ao revisar
-- o call site antes de escrever esta migration), afogando edições de perfil
-- reais (nome/e-mail/telefone/role/status) em ruído de login.
create trigger trg_audit_users_insert
  after insert on public.users
  for each row execute function public.fn_audit_log();

create trigger trg_audit_users_update
  after update on public.users
  for each row
  when (
    old.name is distinct from new.name
    or old.email is distinct from new.email
    or old.phone is distinct from new.phone
    or old.role is distinct from new.role
    or old.status is distinct from new.status
  )
  execute function public.fn_audit_log();

create trigger trg_audit_users_delete
  after delete on public.users
  for each row execute function public.fn_audit_log();

-- ============================================================================
-- Login/logout: sem Auth Hooks configurados neste projeto (infra que não
-- existe hoje) — capturado via RPC dedicada chamada do frontend logo após
-- signInWithPassword/signOut, como o prompt original pedia. Limitação
-- conhecida e aceita: só loga LOGIN COM SUCESSO (uma tentativa de login que
-- falha nunca gera sessão, e sem sessão não há auth.uid() pra uma RPC
-- security definer atribuir a chamada a alguém — logar falha exigiria Auth
-- Hooks server-side, fora de escopo aqui). p_status/p_error_message existem
-- só pra manter o formato da tabela consistente com o resto da auditoria,
-- não porque este caminho consegue reportar falha de verdade.
-- ============================================================================
create or replace function public.log_login()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_email text;
begin
  if auth.uid() is null then
    return;
  end if;
  select users.email into v_user_email from public.users where users.id = auth.uid();
  insert into public.activity_logs (user_id, user_email, action, status, details)
  values (auth.uid(), v_user_email, 'login', 'success', 'login');
end;
$$;

create or replace function public.log_logout()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_email text;
begin
  if auth.uid() is null then
    return;
  end if;
  select users.email into v_user_email from public.users where users.id = auth.uid();
  insert into public.activity_logs (user_id, user_email, action, status, details)
  values (auth.uid(), v_user_email, 'logout', 'success', 'logout');
end;
$$;

grant execute on function public.log_login() to authenticated;
grant execute on function public.log_logout() to authenticated;
