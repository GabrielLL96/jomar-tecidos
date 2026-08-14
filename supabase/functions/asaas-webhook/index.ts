import { createServiceClient } from '../_shared/melhor-envio.ts'
import { ASAAS_SETTINGS_ID } from '../_shared/asaas.ts'

// Diferente da Melhor Envio (assinatura HMAC sobre o corpo), a Asaas usa um
// token estático de comparação direta: o admin gera um valor forte (ver
// AsaasIntegrationCard, botão "Gerar token"), salva aqui, e cadastra o MESMO
// valor no painel da Asaas ao criar o Webhook lá. A Asaas ecoa esse valor em
// TODA chamada no header `asaas-access-token` — nunca reaproveitar a API key
// como esse token (orientação explícita da doc deles: um vazamento do token
// de webhook não expõe a chave de conta).
//
// Pronta pra receber mas inerte de propósito: nenhuma cobrança real é
// criada ainda (Fase 1 = só conectar), não existe coluna de pedido
// vinculável a um payment_id da Asaas. Mesmo padrão já usado no
// melhor-envio-webhook na Fase 1 dessa outra integração — function existe e
// valida o token corretamente desde já, processamento de evento real fica
// pra quando cobrança de verdade existir.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createServiceClient()
  const { data: settings, error: settingsError } = await supabase
    .from('asaas_settings')
    .select('webhook_token')
    .eq('id', ASAAS_SETTINGS_ID)
    .maybeSingle()

  if (settingsError || !settings?.webhook_token) {
    // sem token configurado não tem como validar remetente nenhum — recusa
    // em vez de processar um evento não-autenticável.
    return new Response('Not configured', { status: 401 })
  }

  const receivedToken = req.headers.get('asaas-access-token')
  if (!receivedToken || receivedToken !== settings.webhook_token) {
    return new Response('Invalid token', { status: 401 })
  }

  let payload: { event?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Nenhum pedido vinculável ainda (esperado até cobrança real existir) —
  // só confirma recebimento pra Asaas não ficar reentregando o evento.
  console.log(`[asaas-webhook] evento recebido, ainda inerte: ${payload.event ?? 'desconhecido'}`)

  return new Response('ok', { status: 200 })
})
