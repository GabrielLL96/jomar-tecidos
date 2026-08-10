import {
  corsHeaders,
  createCallerClient,
  createServiceClient,
  MELHOR_ENVIO_BASE_URL,
  MELHOR_ENVIO_SETTINGS_ID,
  requireAdmin,
} from '../_shared/melhor-envio.ts'

interface ExchangeRequestBody {
  code: string
}

interface MelhorEnvioTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const { code } = (await req.json()) as ExchangeRequestBody
    if (!code) throw new Error('Parâmetro "code" ausente')

    const supabase = createServiceClient()
    const { data: settings, error: settingsError } = await supabase
      .from('melhor_envio_settings')
      .select('client_id, client_secret, redirect_uri')
      .eq('id', MELHOR_ENVIO_SETTINGS_ID)
      .maybeSingle()

    if (settingsError) throw new Error(`Falha ao ler configuração: ${settingsError.message}`)
    if (!settings?.client_id || !settings.client_secret || !settings.redirect_uri) {
      throw new Error('client_id/client_secret/redirect_uri não configurados em Configurações > Integrações')
    }

    const tokenResponse = await fetch(`${MELHOR_ENVIO_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        redirect_uri: settings.redirect_uri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text()
      throw new Error(`Melhor Envio recusou o código (${tokenResponse.status}): ${body}`)
    }

    const tokenData = (await tokenResponse.json()) as MelhorEnvioTokenResponse
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    const caller = createCallerClient(req.headers.get('Authorization')!)
    const { data: callerData } = await caller.auth.getUser()
    const callerId = callerData.user?.id ?? null

    const { error: updateError } = await supabase
      .from('melhor_envio_settings')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        connected_by: callerId,
      })
      .eq('id', MELHOR_ENVIO_SETTINGS_ID)

    if (updateError) throw new Error(`Falha ao salvar conexão: ${updateError.message}`)

    return new Response(JSON.stringify({ connected: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
