import { createServiceClient } from './melhor-envio.ts'

export type IntegrationName = 'asaas' | 'melhor_envio'
export type LogDirection = 'outbound' | 'inbound'
export type LogStatus = 'success' | 'failure' | 'timeout'
export type LogEnvironment = 'sandbox' | 'production'

export interface LogIntegrationCallInput {
  integration: IntegrationName
  operation: string
  direction?: LogDirection
  relatedEntity?: string | null
  relatedEntityId?: string | null
  // SEMPRE um resumo explícito montado pelo chamador — nunca o body cru da
  // chamada. Ver comentário no topo da migration 20260815080000 pro porquê.
  requestSummary?: Record<string, unknown> | null
  responseSummary?: Record<string, unknown> | null
  statusHttp?: number | null
  status: LogStatus
  errorMessage?: string | null
  durationMs?: number | null
  environment: LogEnvironment
}

// Nunca deixa uma falha ao registrar o log quebrar a chamada real — mesmo
// princípio já usado em toda escrita best-effort deste projeto (ex.:
// order_status_history não desfaz o pedido se falhar). `await`ado pelos
// chamadores (não fire-and-forget) porque Edge Functions podem ser
// encerradas assim que a Response é devolvida — um insert não aguardado
// pode nunca completar.
export async function logIntegrationCall(input: LogIntegrationCallInput): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('integration_logs').insert({
      integration: input.integration,
      operation: input.operation,
      direction: input.direction ?? 'outbound',
      related_entity: input.relatedEntity ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      request_summary: input.requestSummary ?? null,
      response_summary: input.responseSummary ?? null,
      status_http: input.statusHttp ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
      duration_ms: input.durationMs ?? null,
      environment: input.environment,
    })
    if (error) console.error('[integration-logger] falha ao gravar log:', error.message)
  } catch (error) {
    console.error('[integration-logger] falha ao gravar log:', error)
  }
}

// "Mostrar só os N últimos dígitos" (pedido explícito) — usado só quando o
// CPF em si tem valor real de debug (ex.: confirmar com suporte da Asaas
// qual cadastro é qual). Prefira omitir o campo por completo quando não for
// necessário — mascarar é a exceção, não o padrão.
export function maskDocument(value: string, visibleDigits = 3): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= visibleDigits) return '*'.repeat(digits.length)
  return '*'.repeat(digits.length - visibleDigits) + digits.slice(-visibleDigits)
}
