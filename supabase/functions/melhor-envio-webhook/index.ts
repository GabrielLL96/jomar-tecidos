import { createServiceClient, MELHOR_ENVIO_SETTINGS_ID } from '../_shared/melhor-envio.ts'
import { logIntegrationCall } from '../_shared/integration-logger.ts'

type DeliveryStatus = 'awaiting_pickup' | 'in_transit' | 'delivered' | 'delayed'

// Contrato real da Melhor Envio (docs.melhorenvio.com.br/docs/webhooks,
// consultado em 2026-08-10) — eventos com prefixo "order." disparados por
// mudança no ciclo de vida da ETIQUETA (não existe ainda neste projeto: Fase
// 1 só tem cotação de frete, nenhuma etiqueta é comprada). Esta function fica
// pronta pra receber e processar eventos reais, mas até a Fase 2 (compra de
// etiqueta) gravar deliveries.melhor_envio_shipment_id, todo evento cai no
// caminho "sem pedido correspondente" — inerte de propósito, não um bug.
const STATUS_BY_EVENT: Record<string, DeliveryStatus | undefined> = {
  'order.created': 'awaiting_pickup',
  'order.pending': 'awaiting_pickup',
  'order.released': 'awaiting_pickup',
  'order.generated': 'awaiting_pickup',
  'order.received': 'in_transit',
  'order.posted': 'in_transit',
  'order.delivered': 'delivered',
  'order.undelivered': 'delayed',
  // cancelled/paused/suspended: não mapeiam pra um DeliveryStatus nosso —
  // tracking ainda é atualizado abaixo se vier no payload, status não muda.
}

interface MelhorEnvioWebhookBody {
  event: string
  data: {
    id: string
    protocol?: string
    tracking?: string | null
    tracking_url?: string | null
  }
}

async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return computed === signatureHeader
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()
  const supabase = createServiceClient()

  const { data: settings, error: settingsError } = await supabase
    .from('melhor_envio_settings')
    .select('client_secret')
    .eq('id', MELHOR_ENVIO_SETTINGS_ID)
    .maybeSingle()

  if (settingsError || !settings?.client_secret) {
    // sem secret configurado não tem como verificar assinatura nenhuma —
    // recusa em vez de processar um evento não-autenticável.
    return new Response('Not configured', { status: 401 })
  }

  const signatureValid = await verifySignature(
    rawBody,
    req.headers.get('X-ME-Signature'),
    settings.client_secret,
  )
  if (!signatureValid) return new Response('Invalid signature', { status: 401 })

  let payload: MelhorEnvioWebhookBody
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .select('id, status')
    .eq('melhor_envio_shipment_id', payload.data.id)
    .maybeSingle()

  if (deliveryError) {
    console.error('Falha ao buscar delivery:', deliveryError.message)
    await logIntegrationCall({
      integration: 'melhor_envio',
      operation: 'webhook_received',
      direction: 'inbound',
      requestSummary: { event: payload.event },
      status: 'failure',
      errorMessage: deliveryError.message,
      statusHttp: 200,
      environment: 'sandbox',
    })
    return new Response('ok', { status: 200 })
  }

  // nenhum pedido correspondente (esperado até a Fase 2 existir) — confirma
  // recebimento sem processar, pra Melhor Envio não ficar reentregando.
  if (!delivery) {
    await logIntegrationCall({
      integration: 'melhor_envio',
      operation: 'webhook_received',
      direction: 'inbound',
      requestSummary: { event: payload.event, matched: false },
      status: 'success',
      statusHttp: 200,
      environment: 'sandbox',
    })
    return new Response('ok', { status: 200 })
  }

  const nextStatus = STATUS_BY_EVENT[payload.event]
  const update: Record<string, unknown> = {}
  if (nextStatus) update.status = nextStatus
  if (payload.data.tracking) update.tracking_code = payload.data.tracking
  if (payload.data.tracking_url) update.tracking_url = payload.data.tracking_url

  let updateFailed = false
  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase
      .from('deliveries')
      .update(update)
      .eq('id', delivery.id)
    if (updateError) {
      console.error('Falha ao atualizar delivery:', updateError.message)
      updateFailed = true
    }
  }

  await logIntegrationCall({
    integration: 'melhor_envio',
    operation: 'webhook_received',
    direction: 'inbound',
    relatedEntity: 'deliveries',
    relatedEntityId: delivery.id,
    requestSummary: { event: payload.event, nextStatus: nextStatus ?? null },
    status: updateFailed ? 'failure' : 'success',
    statusHttp: 200,
    environment: 'sandbox',
  })

  return new Response('ok', { status: 200 })
})
