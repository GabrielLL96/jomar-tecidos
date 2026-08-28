import {
  corsHeaders,
  createCallerClient,
  createServiceClient,
  requireAdmin,
} from '../_shared/melhor-envio.ts'
import { getAsaasCredentials, refundAsaasPayment } from '../_shared/asaas.ts'

interface RefundRequestBody {
  orderId: string
  amount?: number
  reason: string
}

const APPROVED_PAYMENT_STATUSES = ['paid', 'shipping', 'delivered']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    await requireAdmin(authHeader)

    const { orderId, amount, reason } = (await req.json()) as RefundRequestBody
    if (!orderId) throw new Error('Pedido não informado')
    if (!reason?.trim()) throw new Error('Informe o motivo do reembolso')
    if (amount !== undefined && amount <= 0)
      throw new Error('Valor do reembolso precisa ser maior que zero')

    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw new Error(`Falha ao ler pedido: ${orderError.message}`)
    if (!order) throw new Error('Pedido não encontrado')
    if (!APPROVED_PAYMENT_STATUSES.includes(order.status)) {
      throw new Error('Só pedidos pagos/enviados/entregues podem ser reembolsados')
    }

    const { data: orderPayment, error: paymentError } = await supabase
      .from('order_payments')
      .select('asaas_payment_id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (paymentError) throw new Error(`Falha ao ler cobrança: ${paymentError.message}`)
    if (!orderPayment?.asaas_payment_id) throw new Error('Pedido sem cobrança Asaas registrada')

    const { data: previousRefunds, error: refundsError } = await supabase
      .from('refunds')
      .select('amount')
      .eq('order_id', orderId)
    if (refundsError) throw new Error(`Falha ao ler reembolsos anteriores: ${refundsError.message}`)

    const alreadyRefunded = (previousRefunds ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    )
    const remaining = Number(order.total) - alreadyRefunded
    if (remaining <= 0) throw new Error('Pedido já foi totalmente reembolsado')

    const refundAmount = amount ?? remaining
    if (refundAmount > remaining) {
      throw new Error(`Valor excede o que ainda pode ser reembolsado (R$ ${remaining.toFixed(2)})`)
    }

    const credentials = await getAsaasCredentials()
    const refundResult = await refundAsaasPayment(
      credentials,
      orderPayment.asaas_payment_id,
      refundAmount,
    )

    const caller = createCallerClient(authHeader!)
    const { data: callerData } = await caller.auth.getUser()
    const { data: callerProfile } = await supabase
      .from('users')
      .select('name')
      .eq('id', callerData.user?.id ?? '')
      .maybeSingle()

    const { error: insertError } = await supabase.from('refunds').insert({
      order_id: orderId,
      amount: refundAmount,
      reason: reason.trim(),
      asaas_refund_id: refundResult.id,
      requested_by: callerData.user?.id ?? null,
      requested_by_name: callerProfile?.name ?? 'Desconhecido',
    })
    if (insertError) throw new Error(`Falha ao gravar reembolso: ${insertError.message}`)

    // Reembolso parcial não muda o status do pedido (decidido no spec) — só
    // vira "refunded" quando cobre o que restava.
    if (refundAmount >= remaining) {
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', orderId)
      if (statusError)
        throw new Error(`Falha ao atualizar status do pedido: ${statusError.message}`)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'refunded',
        changed_by_name: callerProfile?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(`Falha ao gravar histórico: ${historyError.message}`)
    }

    return new Response(JSON.stringify({ refunded: true, amount: refundAmount }), {
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
