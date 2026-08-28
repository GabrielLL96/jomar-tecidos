import {
  corsHeaders,
  createCallerClient,
  createServiceClient,
  requireAdmin,
} from '../_shared/melhor-envio.ts'
import { ASAAS_SETTINGS_ID, asaasAuthHeaders, getAsaasBaseUrl } from '../_shared/asaas.ts'

// Diferente da Melhor Envio (OAuth), a Asaas autentica por API key estática
// — não há "code" pra trocar. "Conectar" aqui é só: ler a chave já salva
// (via UPDATE feito pelo client antes de chamar essa function, mesmo padrão
// write-only já usado em melhor_envio_settings.client_secret) e confirmar
// que ela é válida chamando um endpoint de leitura real da Asaas. Sem
// endpoint de "validar chave" dedicado na API deles — GET /v3/finance/balance
// é o mais barato que exige autenticação de verdade sem side effect nenhum.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const supabase = createServiceClient()
    const { data: settings, error: settingsError } = await supabase
      .from('asaas_settings')
      .select('environment, api_key')
      .eq('id', ASAAS_SETTINGS_ID)
      .maybeSingle()

    if (settingsError) throw new Error(`Falha ao ler configuração: ${settingsError.message}`)
    if (!settings?.api_key) {
      throw new Error('API key não configurada — salve a chave antes de testar a conexão')
    }

    const baseUrl = getAsaasBaseUrl(settings.environment)
    const response = await fetch(`${baseUrl}/v3/finance/balance`, {
      headers: asaasAuthHeaders(settings.api_key),
    })

    if (!response.ok) {
      const body = await response.text()
      // 401 é o caso comum (chave errada ou trocada — ex: chave de produção
      // colada com ambiente "sandbox" selecionado). Mensagem já deixa isso
      // explícito em vez de só repassar o corpo cru da Asaas.
      if (response.status === 401) {
        throw new Error(
          `API key inválida para o ambiente "${settings.environment}" (${response.status})`,
        )
      }
      throw new Error(`Asaas recusou a chave (${response.status}): ${body}`)
    }

    const caller = createCallerClient(req.headers.get('Authorization')!)
    const { data: callerData } = await caller.auth.getUser()
    const callerId = callerData.user?.id ?? null

    const { error: updateError } = await supabase
      .from('asaas_settings')
      .update({ connected_at: new Date().toISOString(), connected_by: callerId })
      .eq('id', ASAAS_SETTINGS_ID)

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
