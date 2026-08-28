import { corsHeaders, createCallerClient, createServiceClient } from '../_shared/melhor-envio.ts'
import {
  createAsaasPayment,
  dueDateFor,
  getAsaasCredentials,
  getAsaasPixQrCode,
  getOrCreateAsaasCustomer,
  type CreateAsaasPaymentInput,
} from '../_shared/asaas.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'

interface CreateChargeRequestBody {
  orderId: string
  paymentMethod: 'credit_card' | 'pix' | 'boleto'
  installments?: number
}

const BILLING_TYPE_BY_METHOD: Record<
  CreateChargeRequestBody['paymentMethod'],
  CreateAsaasPaymentInput['billingType']
> = {
  credit_card: 'CREDIT_CARD',
  pix: 'PIX',
  boleto: 'BOLETO',
}

const SITE_URL = 'https://jomartecidos.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')
    const caller = createCallerClient(authHeader)
    const { data: callerData, error: callerError } = await caller.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Sessão inválida')
    const userId = callerData.user.id

    await enforceRateLimit(userId, 'asaas-create-charge', 10, 600)

    const { orderId, paymentMethod, installments } = (await req.json()) as CreateChargeRequestBody
    if (!orderId || !paymentMethod) throw new Error('Parâmetros ausentes')

    // Parcelamento (até 3x, sem juros) só existe pra cartão — nunca confia no
    // client sozinho pra decidir a parcela, é dinheiro (mesmo princípio já
    // usado no resto desta function e em create_order() pro unit_price).
    if (installments !== undefined) {
      if (paymentMethod !== 'credit_card')
        throw new Error('Parcelamento só é válido pra cartão de crédito')
      if (!Number.isInteger(installments) || installments < 1 || installments > 3) {
        throw new Error('Número de parcelas inválido')
      }
    }

    const supabase = createServiceClient()

    // Pedido precisa ser do próprio chamador e ainda estar pending — nunca
    // confia em valor/dono vindo do client, sempre relê do servidor (mesmo
    // princípio já usado em create_order() pro unit_price/shipping_cost).
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw new Error(`Falha ao ler pedido: ${orderError.message}`)
    if (!order || order.user_id !== userId) throw new Error('Pedido não encontrado')
    if (order.status !== 'pending') throw new Error('Pedido já não está mais aguardando pagamento')

    // Uma cobrança por pedido — se já existe qualquer linha em
    // order_payments pra esse pedido, uma cobrança real já foi criada na
    // Asaas antes (ver limitação documentada no spec: sem troca de método
    // no mesmo pedido).
    const { data: existingPayment, error: existingError } = await supabase
      .from('order_payments')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (existingError)
      throw new Error(`Falha ao checar cobrança existente: ${existingError.message}`)
    if (existingPayment) throw new Error('Esse pedido já tem uma cobrança criada')

    const credentials = await getAsaasCredentials()
    const customerId = await getOrCreateAsaasCustomer(credentials, userId)

    const billingType = BILLING_TYPE_BY_METHOD[paymentMethod]
    const payment = await createAsaasPayment(credentials, {
      customerId,
      billingType,
      value: Number(order.total),
      dueDate: dueDateFor(billingType),
      externalReference: order.id,
      // Só cartão usa a fatura hospedada — Pix/boleto mostram o QR/link na
      // própria página, sem redirect (ver spec).
      successUrl: billingType === 'CREDIT_CARD' ? `${SITE_URL}/pedido/${order.id}` : undefined,
      installmentCount: billingType === 'CREDIT_CARD' ? installments : undefined,
    })

    let pixQrCode: string | null = null
    let pixCopyPaste: string | null = null
    let pixExpiration: string | null = null
    if (billingType === 'PIX') {
      // Achado real testando em sandbox: buscar o QR code pode falhar por
      // motivo alheio à cobrança em si (ex: conta Asaas sem chave Pix
      // cadastrada) — a cobrança já foi criada de verdade na Asaas nesse
      // ponto, então deixar essa falha estourar a function inteira perderia
      // o registro local dela (cobrança "órfã", só existente do lado da
      // Asaas). Erro aqui vira aviso no log, não impede salvar order_payments
      // — o client ainda tem invoiceUrl como caminho alternativo de pagamento.
      try {
        const qrCode = await getAsaasPixQrCode(credentials, payment.id)
        pixQrCode = qrCode.encodedImage
        pixCopyPaste = qrCode.payload
        pixExpiration = qrCode.expirationDate
      } catch (qrError) {
        console.error('[asaas-create-charge] falha ao buscar QR code Pix:', qrError)
      }
    }

    const paymentRow = payment as unknown as {
      bankSlipUrl?: string
      identificationField?: string
    }

    const { error: insertError } = await supabase.from('order_payments').insert({
      order_id: order.id,
      asaas_payment_id: payment.id,
      payment_method: paymentMethod,
      status: 'pending',
      amount: order.total,
      pix_qr_code: pixQrCode,
      pix_copy_paste: pixCopyPaste,
      pix_expiration: pixExpiration,
      boleto_url: paymentRow.bankSlipUrl ?? null,
      boleto_barcode: paymentRow.identificationField ?? null,
      invoice_url: payment.invoiceUrl,
      due_date: payment.dueDate,
      installment_count: billingType === 'CREDIT_CARD' ? (installments ?? 1) : 1,
    })
    if (insertError) throw new Error(`Falha ao salvar cobrança: ${insertError.message}`)

    return new Response(
      JSON.stringify({
        invoiceUrl: payment.invoiceUrl,
        pixQrCode,
        pixCopyPaste,
        pixExpiration,
        boletoUrl: paymentRow.bankSlipUrl ?? null,
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
