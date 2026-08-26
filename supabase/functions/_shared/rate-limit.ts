import { createServiceClient } from './melhor-envio.ts'

// Achado da auditoria LGPD (docs/lgpd/auditoria-2026-08-15.md) — endpoints
// que tratam dado pessoal/pagamento precisam de rate limit, não só RLS.
// Usa a function security definer check_and_record_rate_limit (migration
// 20260815030000) — nunca conta/insere direto na tabela por aqui, pra manter
// uma única fonte de verdade da lógica de janela.
export async function enforceRateLimit(
  userId: string,
  endpoint: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<void> {
  const supabase = createServiceClient()
  const { data: allowed, error } = await supabase.rpc('check_and_record_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  })
  if (error) throw new Error(`Falha ao checar limite de tentativas: ${error.message}`)
  if (!allowed) throw new Error('Muitas tentativas em pouco tempo — aguarde alguns minutos e tente de novo')
}

// Mesmo princípio, mas pra chamador anônimo (sem user_id) — usa IP como
// identificador, tabela/function separadas (rate_limit_attempts_anon,
// migration 20260826000000) pra não mudar a assinatura do rate limiter
// uuid-based já usado pelos endpoints de pagamento.
export async function enforceRateLimitByIp(
  identifier: string,
  endpoint: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<void> {
  const supabase = createServiceClient()
  const { data: allowed, error } = await supabase.rpc('check_and_record_rate_limit_by_ip', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  })
  if (error) throw new Error(`Falha ao checar limite de tentativas: ${error.message}`)
  if (!allowed) throw new Error('Muitas tentativas em pouco tempo — aguarde alguns minutos e tente de novo')
}
