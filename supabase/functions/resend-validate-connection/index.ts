import { corsHeaders, createCallerClient, createServiceClient, requireAdmin } from '../_shared/melhor-envio.ts'
import { RESEND_SETTINGS_ID } from '../_shared/resend.ts'

// Resend não tem endpoint dedicado de "validar chave" — GET /domains é o
// mais barato que exige autenticação de verdade sem side effect nenhum
// (mesmo raciocínio já usado em asaas-validate-connection com
// /v3/finance/balance).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const supabase = createServiceClient()
    const { data: settings, error: settingsError } = await supabase
      .from('resend_settings')
      .select('api_key, from_email')
      .eq('id', RESEND_SETTINGS_ID)
      .maybeSingle()

    if (settingsError) throw new Error(`Falha ao ler configuração: ${settingsError.message}`)
    if (!settings?.api_key) throw new Error('API key não configurada — salve a chave antes de testar a conexão')
    if (!settings.from_email) throw new Error('Configure o e-mail de remetente antes de testar a conexão')

    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${settings.api_key}` },
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API key inválida (${response.status})`)
      }
      const body = await response.text()
      throw new Error(`Resend recusou a chave (${response.status}): ${body}`)
    }

    // Confirma que o domínio do e-mail de remetente está de fato verificado
    // na conta — sem isso, o Resend aceita a chave mas rejeita cada envio
    // real (ou entrega como spam), o que só apareceria muito depois, no
    // primeiro pedido de verdade.
    const domainsBody = (await response.json()) as { data?: { name: string; status: string }[] }
    const fromDomain = settings.from_email.split('@')[1]?.toLowerCase()
    const matchingDomain = domainsBody.data?.find((domain) => domain.name.toLowerCase() === fromDomain)
    if (!matchingDomain) {
      throw new Error(`Domínio "${fromDomain}" não está cadastrado nesta conta Resend`)
    }
    if (matchingDomain.status !== 'verified') {
      throw new Error(`Domínio "${fromDomain}" ainda não está verificado no Resend (status: ${matchingDomain.status})`)
    }

    const caller = createCallerClient(req.headers.get('Authorization')!)
    const { data: callerData } = await caller.auth.getUser()
    const callerId = callerData.user?.id ?? null

    const { error: updateError } = await supabase
      .from('resend_settings')
      .update({ connected_at: new Date().toISOString(), connected_by: callerId })
      .eq('id', RESEND_SETTINGS_ID)
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
