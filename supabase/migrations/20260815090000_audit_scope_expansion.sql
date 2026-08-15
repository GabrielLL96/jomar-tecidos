-- ============================================================================
-- Expansão de escopo da auditoria (activity_logs) conforme lista fechada com
-- o usuário: estoque (com motivo), reembolso e cobrança (linkados a
-- order_id), tentativa de login falha. As entidades genéricas já cobertas
-- pelo trigger fn_audit_log() (produtos/pedidos/order_items/usuários/
-- composições/cupons/entregas) não mudam aqui.
--
-- stock_movements/refunds/order_payments são append-only (refunds/
-- stock_movements) ou insert+update sem delete (order_payments) — trigger
-- dedicado por tabela, não fn_audit_log() genérico, porque cada uma precisa
-- de um entity_id DIFERENTE do próprio id da linha (o pedido relacionado,
-- pra "clicar no log → ir direto pro pedido" funcionar) e/ou mascarar campos
-- específicos.
-- ============================================================================

grant insert on public.activity_logs to service_role;

-- ----------------------------------------------------------------------------
-- Estoque: ajuste manual (stock_movements já carrega o motivo, ver ADR-010).
-- entity_id = product_id (não o id do movimento) — liga direto ao produto.
-- ----------------------------------------------------------------------------
create or replace function public.fn_audit_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_email text;
begin
  select users.email into v_user_email from public.users where users.id = new.user_id;
  insert into public.activity_logs (
    user_id, user_email, action, entity, entity_id, data_after, details
  ) values (
    new.user_id,
    v_user_email,
    'update',
    'stock_movements',
    new.product_id,
    jsonb_build_object('quantity', new.quantity, 'reason', new.reason),
    'ajuste de estoque: ' || new.quantity || ' — ' || new.reason
  );
  return new;
end;
$$;

create trigger trg_audit_stock_movements
  after insert on public.stock_movements
  for each row execute function public.fn_audit_stock_movement();

-- ----------------------------------------------------------------------------
-- Reembolso/estorno: refunds já carrega requested_by (populado pela Edge
-- Function asaas-refund com a identidade real de quem pediu) — usa a coluna
-- da própria linha em vez de auth.uid(), que resolveria null aqui mesmo
-- assim (a escrita real acontece via service_role dentro da Edge Function).
-- entity_id = order_id, não o id do reembolso.
-- ----------------------------------------------------------------------------
create or replace function public.fn_audit_refund()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_email text;
begin
  select users.email into v_user_email from public.users where users.id = new.requested_by;
  insert into public.activity_logs (
    user_id, user_email, action, entity, entity_id, data_after, details
  ) values (
    new.requested_by,
    v_user_email,
    'update',
    'refunds',
    new.order_id,
    jsonb_build_object('amount', new.amount, 'reason', new.reason),
    new.requested_by_name || ' reembolsou R$ ' || new.amount || ' — ' || new.reason
  );
  return new;
end;
$$;

create trigger trg_audit_refunds
  after insert on public.refunds
  for each row execute function public.fn_audit_refund();

-- ----------------------------------------------------------------------------
-- Cobrança: gerada (insert) e confirmada/estornada/vencida (update de
-- status) — cobre "cobrança gerada, confirmada ou estornada" sem precisar
-- instrumentar cada Edge Function (asaas-create-charge/asaas-charge-card/
-- asaas-charge-with-token/asaas-webhook) individualmente. entity_id =
-- order_id. user_id fica null aqui (toda escrita passa por service_role
-- dentro de Edge Function, sem contexto de auth.uid() — mesma limitação já
-- documentada em fn_audit_log() pra esse cenário) — mas o pedido em si já
-- tem o dono (orders.user_id), então não se perde a rastreabilidade, só o
-- atalho de um join a menos.
--
-- Nunca grava pix_qr_code/pix_copy_paste/boleto_barcode — são o próprio meio
-- de pagamento, sem valor de auditoria (o que importa é que status mudou,
-- não o conteúdo do QR code).
-- ----------------------------------------------------------------------------
create or replace function public.fn_audit_order_payment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_logs (
    action, entity, entity_id, data_before, data_after, details
  ) values (
    lower(tg_op),
    'order_payments',
    new.order_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status) else null end,
    jsonb_build_object(
      'status', new.status,
      'amount', new.amount,
      'payment_method', new.payment_method,
      'asaas_payment_id', new.asaas_payment_id
    ),
    'cobrança ' || lower(tg_op) || ': ' || new.status
  );
  return new;
end;
$$;

create trigger trg_audit_order_payments
  after insert or update on public.order_payments
  for each row execute function public.fn_audit_order_payment();

-- ----------------------------------------------------------------------------
-- Login falho: sem sessão, não existe auth.uid() pra atribuir a tentativa a
-- ninguém verificável — user_email é o que o formulário de login tentou,
-- SEM VALIDAÇÃO server-side de que quem chamou é dono desse e-mail (mesma
-- limitação já documentada pra log_login() de sucesso, na direção oposta:
-- lá o problema era timing, aqui é a ausência estrutural de qualquer
-- identidade verificável antes de autenticar). Groselha aceitável: é
-- inerente ao próprio conceito de "log de tentativa que falhou".
-- ----------------------------------------------------------------------------
create or replace function public.log_failed_login(p_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_logs (action, status, user_email, details)
  values ('login', 'failure', left(p_email, 255), 'tentativa de login falhou');
end;
$$;

grant execute on function public.log_failed_login(text) to anon, authenticated;
