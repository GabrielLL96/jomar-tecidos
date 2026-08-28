import { createClient } from 'npm:@supabase/supabase-js@2.112.0'
import { logIntegrationCall, type LogStatus } from './integration-logger.ts'

export const MELHOR_ENVIO_BASE_URL = 'https://sandbox.melhorenvio.com.br'
export const MELHOR_ENVIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

// margem de segurança pra disparar o refresh antes do access_token expirar
// de verdade (30 dias) — refresh é lazy (sob demanda), não cron, ver ADR do
// plano desta feature.
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function createServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

// Client com o JWT de quem chamou a Edge Function — usado só pra confirmar o
// papel do usuário via current_user_role() (mesma function que todo o resto
// do schema já confia pra checagem de staff/admin), nunca pra ler/gravar
// dado sensível.
export function createCallerClient(authorizationHeader: string) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorizationHeader } },
  })
}

export async function requireAdmin(authorizationHeader: string | null) {
  if (!authorizationHeader) throw new Error('Não autenticado')
  const caller = createCallerClient(authorizationHeader)
  const { data: role, error } = await caller.rpc('current_user_role')
  if (error) throw new Error(`Falha ao checar papel do usuário: ${error.message}`)
  if (role !== 'admin') throw new Error('Só admin pode fazer essa ação')
}

export async function requireAuthenticated(authorizationHeader: string | null) {
  if (!authorizationHeader) throw new Error('Não autenticado')
  const caller = createCallerClient(authorizationHeader)
  const { data, error } = await caller.auth.getUser()
  if (error || !data.user) throw new Error('Sessão inválida')
}

// ============================================================================
// Base URL da Melhor Envio neste projeto é sempre sandbox (constante acima,
// nunca lida de configuração) — não existe ambiente de produção Melhor Envio
// suportado ainda, diferente da Asaas (que já tem sandbox/production reais
// via asaas_settings.environment). `environment: 'sandbox'` abaixo reflete
// isso, não é um valor arbitrário.
// ============================================================================

interface MelhorEnvioLogMeta {
  operation: string
  relatedEntity?: string
  relatedEntityId?: string
  // SEMPRE um resumo explícito (allowlist) — nunca o body cru. client_secret/
  // access_token/refresh_token NUNCA entram aqui, em nenhuma chamada.
  requestSummary?: Record<string, unknown> | null
  summarizeResponse?: (parsed: unknown) => Record<string, unknown> | null
}

export async function melhorEnvioFetch(
  path: string,
  init: RequestInit,
  logMeta: MelhorEnvioLogMeta,
): Promise<unknown> {
  const startedAt = Date.now()
  let statusHttp: number | null = null
  let status: LogStatus = 'success'
  let errorMessage: string | null = null
  let parsed: unknown = null

  try {
    const response = await fetch(`${MELHOR_ENVIO_BASE_URL}${path}`, init)
    statusHttp = response.status
    if (!response.ok) {
      status = 'failure'
      errorMessage = `Melhor Envio recusou (${response.status}): ${await response.text()}`
      throw new Error(errorMessage)
    }
    parsed = await response.json()
    return parsed
  } catch (error) {
    status = 'failure'
    if (!errorMessage) errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    throw error
  } finally {
    await logIntegrationCall({
      integration: 'melhor_envio',
      operation: logMeta.operation,
      relatedEntity: logMeta.relatedEntity,
      relatedEntityId: logMeta.relatedEntityId,
      requestSummary: logMeta.requestSummary ?? null,
      responseSummary:
        status === 'success' && logMeta.summarizeResponse
          ? logMeta.summarizeResponse(parsed)
          : null,
      statusHttp,
      status,
      errorMessage,
      durationMs: Date.now() - startedAt,
      environment: 'sandbox',
    })
  }
}

interface MelhorEnvioTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

/**
 * Lê o token salvo e renova via refresh_token se estiver perto de expirar.
 * Única função que toca client_secret/tokens — sempre com o client
 * service_role, nunca exposto fora das Edge Functions.
 */
export async function getValidAccessToken(): Promise<string> {
  const supabase = createServiceClient()
  const { data: settings, error } = await supabase
    .from('melhor_envio_settings')
    .select('client_id, client_secret, access_token, refresh_token, token_expires_at')
    .eq('id', MELHOR_ENVIO_SETTINGS_ID)
    .maybeSingle()

  if (error) throw new Error(`Falha ao ler configuração da Melhor Envio: ${error.message}`)
  if (!settings?.access_token || !settings.refresh_token) {
    throw new Error('Melhor Envio não está conectado. Conecte em Configurações > Integrações.')
  }

  const expiresAt = settings.token_expires_at ? new Date(settings.token_expires_at).getTime() : 0
  if (expiresAt - Date.now() >= REFRESH_MARGIN_MS) {
    return settings.access_token
  }

  if (!settings.client_id || !settings.client_secret) {
    throw new Error(
      'Melhor Envio: client_id/client_secret ausentes, não foi possível renovar o token.',
    )
  }

  const tokenData = (await melhorEnvioFetch(
    '/oauth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        refresh_token: settings.refresh_token,
      }),
    },
    {
      operation: 'refresh_token',
      // client_id é público (não secret), seguro incluir; client_secret e os
      // tokens em si NUNCA entram no log, nem na resposta.
      requestSummary: { grantType: 'refresh_token' },
      summarizeResponse: () => ({ refreshed: true }),
    },
  )) as MelhorEnvioTokenResponse
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error: updateError } = await supabase
    .from('melhor_envio_settings')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', MELHOR_ENVIO_SETTINGS_ID)

  if (updateError) throw new Error(`Falha ao salvar token renovado: ${updateError.message}`)

  return tokenData.access_token
}
