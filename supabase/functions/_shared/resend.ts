import { createServiceClient } from './melhor-envio.ts'
import { logIntegrationCall, type LogStatus } from './integration-logger.ts'

export const RESEND_SETTINGS_ID = '00000000-0000-0000-0000-000000000003'
const RESEND_BASE_URL = 'https://api.resend.com'

export interface ResendCredentials {
  apiKey: string
  fromEmail: string
  fromName: string
  contactNotificationEmail: string | null
}

export async function getResendCredentials(): Promise<ResendCredentials> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('resend_settings')
    .select('api_key, from_email, from_name, contact_notification_email')
    .eq('id', RESEND_SETTINGS_ID)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler configuração do Resend: ${error.message}`)
  if (!data?.api_key) throw new Error('Resend não configurado — conecte em Configurações > Integrações')
  if (!data.from_email) throw new Error('Resend sem e-mail de remetente configurado')
  return {
    apiKey: data.api_key,
    fromEmail: data.from_email,
    fromName: data.from_name ?? 'Jomar Tecidos e Enxovais',
    contactNotificationEmail: data.contact_notification_email,
  }
}

interface ResendLogMeta {
  operation: string
  relatedEntity?: string
  relatedEntityId?: string
  requestSummary?: Record<string, unknown> | null
}

// Formato real de erro do Resend: { message, name }. Nunca inclui o corpo
// do e-mail (html/subject) no log — só metadado (destinatário, operação).
async function resendErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string' && body.message) return body.message
  } catch {
    // corpo não era JSON — cai no genérico abaixo
  }
  return `Resend recusou a chamada (HTTP ${response.status})`
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  replyTo?: string
}

// Nunca deixa uma falha de e-mail derrubar o fluxo que a chamou (pedido,
// webhook) — mesmo princípio de "best effort" já usado em order_status_history
// e no log de integração deste projeto. O chamador decide se precisa de
// try/catch em volta; esta function sempre propaga o erro (pra quem quiser
// tratar) mas nunca lança algo além de `Error`.
export async function sendEmail(credentials: ResendCredentials, input: SendEmailInput, logMeta: ResendLogMeta): Promise<string> {
  const startedAt = Date.now()
  let statusHttp: number | null = null
  let status: LogStatus = 'success'
  let errorMessage: string | null = null
  let emailId: string | null = null

  try {
    const response = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${credentials.fromName} <${credentials.fromEmail}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })
    statusHttp = response.status
    if (!response.ok) {
      status = 'failure'
      errorMessage = await resendErrorMessage(response)
      throw new Error(errorMessage)
    }
    const parsed = (await response.json()) as { id?: string }
    emailId = parsed.id ?? null
    return emailId ?? ''
  } catch (error) {
    status = 'failure'
    if (!errorMessage) errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    throw error
  } finally {
    await logIntegrationCall({
      integration: 'resend',
      operation: logMeta.operation,
      relatedEntity: logMeta.relatedEntity,
      relatedEntityId: logMeta.relatedEntityId,
      // NUNCA inclui subject/html — corpo do e-mail não é dado seguro de
      // persistir em log (pode conter nome/endereço do cliente). Só metadado.
      requestSummary: { to: input.to, ...(logMeta.requestSummary ?? {}) },
      responseSummary: status === 'success' ? { emailId } : null,
      statusHttp,
      status,
      errorMessage,
      durationMs: Date.now() - startedAt,
      // Resend não tem sandbox/produção — valor fixo (constraint da tabela
      // exige um dos dois, ver comentário na migration).
      environment: 'production',
    })
  }
}
