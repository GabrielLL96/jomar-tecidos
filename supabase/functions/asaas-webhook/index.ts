import { createServiceClient } from '../_shared/melhor-envio.ts'
import { ASAAS_SETTINGS_ID } from '../_shared/asaas.ts'

type OrderPaymentStatus = 'pending' | 'confirmed' | 'overdue' | 'cancelled' | 'refunded'

// payload real da Asaas (docs.asaas.com/docs/webhook-para-cobrancas):
// { event: string, payment: { id: string, status: string, ... } }
interface AsaasWebhookBody {
  event: string
  payment?: { id: string }
}

const ORDER_PAYMENT_STATUS_BY_EVENT: Record<string, OrderPaymentStatus | undefined> = {
  PAYMENT_CONFIRMED: 'confirmed',
  PAYMENT_RECEIVED: 'confirmed',
  PAYMENT_OVERDUE: 'overdue',
  PAYMENT_DELETED: 'cancelled',
  PAYMENT_CANCELED: 'cancelled',
  PAYMENT_REFUNDED: 'refunded',
  // reembolso parcial não muda order_payments.status pra 'refunded' — a
  // cobrança em si não foi totalmente revertida (mesma decisão de não mudar
  // orders.status abaixo).
}

const APPROVED_PAYMENT_STATUSES = ['paid', 'shipping', 'delivered']

// Token estático comparado direto (não HMAC) — mesmo mecanismo já usado na
// Fase 1, nunca reaproveitar a API key como esse token (orientação da Asaas).
async function isTokenValid(req: Request, supabase: ReturnType<typeof createServiceClient>) {
  const { data: settings, error } = await supabase
    .from('asaas_settings')
    .select('webhook_token')
    .eq('id', ASAAS_SETTINGS_ID)
    .maybeSingle()
  if (error || !settings?.webhook_token) return false
  const receivedToken = req.headers.get('asaas-access-token')
  return !!receivedToken && receivedToken === settings.webhook_token
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createServiceClient()

  if (!(await isTokenValid(req, supabase))) {
    return new Response('Invalid token', { status: 401 })
  }

  let payload: AsaasWebhookBody
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const asaasPaymentId = payload.payment?.id
  if (!asaasPaymentId) return new Response('ok', { status: 200 })

  const { data: orderPayment, error: paymentError } = await supabase
    .from('order_payments')
    .select('id, order_id, status')
    .eq('asaas_payment_id', asaasPaymentId)
    .maybeSingle()

  if (paymentError) {
    console.error('[asaas-webhook] falha ao buscar order_payments:', paymentError.message)
    return new Response('ok', { status: 200 })
  }

  // sem cobrança correspondente localmente — confirma recebimento sem
  // processar (evita a Asaas reenviar), mesmo padrão do melhor-envio-webhook.
  if (!orderPayment) return new Response('ok', { status: 200 })

  const nextPaymentStatus = ORDER_PAYMENT_STATUS_BY_EVENT[payload.event]
  if (nextPaymentStatus && nextPaymentStatus !== orderPayment.status) {
    const { error: updateError } = await supabase
      .from('order_payments')
      .update({
        status: nextPaymentStatus,
        ...(nextPaymentStatus === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderPayment.id)
    if (updateError) console.error('[asaas-webhook] falha ao atualizar order_payments:', updateError.message)
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderPayment.order_id)
    .maybeSingle()
  if (orderError || !order) return new Response('ok', { status: 200 })

  // idempotente por design: só transiciona se o pedido ainda estiver no
  // status "de origem" esperado — reenvio do mesmo evento não duplica
  // order_status_history nem regride status.
  const isConfirmEvent = payload.event === 'PAYMENT_CONFIRMED' || payload.event === 'PAYMENT_RECEIVED'
  const isRefundEvent = payload.event === 'PAYMENT_REFUNDED'

  let nextOrderStatus: string | null = null
  if (isConfirmEvent && order.status === 'pending') {
    nextOrderStatus = 'paid'
  } else if (isRefundEvent && APPROVED_PAYMENT_STATUSES.includes(order.status)) {
    // cobre reembolso feito direto no painel da Asaas, fora do botão do
    // admin — o webhook é a fonte da verdade pro status, não só o botão.
    // Não grava linha em `refunds` aqui (sem motivo/valor confiável vindos
    // do evento) — só reflete o status; reembolsos feitos pelo nosso botão
    // já gravam `refunds` na hora, antes desse webhook chegar.
    nextOrderStatus = 'refunded'
  }

  if (nextOrderStatus) {
    const { error: statusError } = await supabase.from('orders').update({ status: nextOrderStatus }).eq('id', order.id)
    if (statusError) {
      console.error('[asaas-webhook] falha ao atualizar orders.status:', statusError.message)
      return new Response('ok', { status: 200 })
    }
    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: nextOrderStatus,
      changed_by_name: 'Asaas (webhook)',
    })
    if (historyError) console.error('[asaas-webhook] falha ao gravar order_status_history:', historyError.message)
  }

  return new Response('ok', { status: 200 })
})
