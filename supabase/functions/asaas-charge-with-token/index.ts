import { corsHeaders, createCallerClient, createServiceClient } from '../_shared/melhor-envio.ts'
import {
  createAsaasPaymentWithToken,
  dueDateFor,
  getAsaasCredentials,
  getClientIp,
  getOrCreateAsaasCustomer,
} from '../_shared/asaas.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'

// Cobrança recorrente/futura com um cartão já salvo (asaas-charge-card) — só
// o creditCardToken viaja, nenhum dado de cartão cru passa por aqui.
interface ChargeWithTokenRequestBody {
  orderId: string
  savedCardId: string
  installments?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')
    const caller = createCallerClient(authHeader)
    const { data: callerData, error: callerError } = await caller.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Sessão inválida')
    const userId = callerData.user.id

    await enforceRateLimit(userId, 'asaas-charge-with-token', 5, 600)

    const { orderId, savedCardId, installments } = (await req.json()) as ChargeWithTokenRequestBody
    if (!orderId || !savedCardId) throw new Error('Parâmetros ausentes')

    if (installments !== undefined) {
      if (!Number.isInteger(installments) || installments < 1 || installments > 3) {
        throw new Error('Número de parcelas inválido')
      }
    }

    const remoteIp = getClientIp(req)
    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw new Error(`Falha ao ler pedido: ${orderError.message}`)
    if (!order || order.user_id !== userId) throw new Error('Pedido não encontrado')
    if (order.status !== 'pending') throw new Error('Pedido já não está mais aguardando pagamento')

    const { data: existingPayment, error: existingError } = await supabase
      .from('order_payments')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (existingError)
      throw new Error(`Falha ao checar cobrança existente: ${existingError.message}`)
    if (existingPayment) throw new Error('Esse pedido já tem uma cobrança criada')

    // Cartão salvo precisa ser do próprio chamador — nunca confia só no id
    // vindo do client (mesmo princípio de sempre checar posse, igual
    // addresses/orders no resto do projeto).
    const { data: savedCard, error: savedCardError } = await supabase
      .from('saved_credit_cards')
      .select('id, user_id, credit_card_token, last_four_digits')
      .eq('id', savedCardId)
      .maybeSingle()
    if (savedCardError) throw new Error(`Falha ao ler cartão salvo: ${savedCardError.message}`)
    if (!savedCard || savedCard.user_id !== userId) throw new Error('Cartão salvo não encontrado')

    const credentials = await getAsaasCredentials()
    const customerId = await getOrCreateAsaasCustomer(credentials, userId)

    let charge
    try {
      charge = await createAsaasPaymentWithToken(credentials, {
        customerId,
        value: Number(order.total),
        dueDate: dueDateFor('CREDIT_CARD'),
        externalReference: order.id,
        remoteIp,
        creditCardToken: savedCard.credit_card_token,
        installmentCount: installments,
      })
    } catch (chargeError) {
      const message = chargeError instanceof Error ? chargeError.message : 'Cartão recusado'
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: insertPaymentError } = await supabase.from('order_payments').insert({
      order_id: order.id,
      asaas_payment_id: charge.id,
      payment_method: 'credit_card',
      status: 'confirmed',
      amount: order.total,
      due_date: charge.dueDate,
      confirmed_at: new Date().toISOString(),
      installment_count: installments ?? 1,
    })
    if (insertPaymentError)
      throw new Error(`Falha ao salvar cobrança: ${insertPaymentError.message}`)

    const { error: statusError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)
    if (statusError) throw new Error(`Falha ao atualizar status do pedido: ${statusError.message}`)
    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'paid',
      changed_by_name: 'Asaas (cartão salvo)',
    })
    if (historyError) {
      console.error(
        '[asaas-charge-with-token] falha ao gravar order_status_history:',
        historyError.message,
      )
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        status: charge.status,
        last4: savedCard.last_four_digits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
