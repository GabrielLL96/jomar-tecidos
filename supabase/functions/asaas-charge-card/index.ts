import { corsHeaders, createCallerClient, createServiceClient } from '../_shared/melhor-envio.ts'
import {
  createAsaasPaymentWithCard,
  dueDateFor,
  getAsaasCredentials,
  getClientIp,
  getOrCreateAsaasCustomer,
} from '../_shared/asaas.ts'

// Dado de cartão cru (número/CVV/validade) chega aqui e é repassado direto
// pra Asaas na mesma invocação — NUNCA gravado em log, banco ou storage, em
// lugar nenhum desta function. Só o creditCardToken que a Asaas devolve
// depois de aprovar é persistido (saved_credit_cards). Ver migration
// 20260815020000 e a decisão que reabriu esse escopo (ADR-016).
interface ChargeCardRequestBody {
  orderId: string
  installments?: number
  card: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  holderInfo: {
    postalCode: string
    addressNumber: string
    addressComplement?: string
  }
  saveCard: boolean
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

    const body = (await req.json()) as ChargeCardRequestBody
    const { orderId, installments, card, holderInfo, saveCard } = body
    if (!orderId || !card || !holderInfo) throw new Error('Parâmetros ausentes')

    if (installments !== undefined) {
      if (!Number.isInteger(installments) || installments < 1 || installments > 3) {
        throw new Error('Número de parcelas inválido')
      }
    }

    const remoteIp = getClientIp(req)
    const supabase = createServiceClient()

    // Mesmos dois checks de asaas-create-charge: pedido é do chamador e ainda
    // não tem cobrança — nunca confia em dono/valor vindo do client.
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
    if (existingError) throw new Error(`Falha ao checar cobrança existente: ${existingError.message}`)
    if (existingPayment) throw new Error('Esse pedido já tem uma cobrança criada')

    // Holder info é montado no servidor a partir do cadastro real (nome,
    // e-mail, CPF, telefone) — só postalCode/addressNumber vêm do client,
    // porque addresses.street é texto livre sem número separado (ver
    // _Architecture.md). Nunca confia no nome/e-mail/CPF que o client mandar
    // pra montar creditCardHolderInfo, mesmo princípio de nunca confiar em
    // dado financeiro/identificação vindo do client sem checar contra o
    // servidor.
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, email, cpf, phone')
      .eq('id', userId)
      .single()
    if (userError) throw new Error(`Falha ao ler usuário: ${userError.message}`)
    if (!user.cpf) throw new Error('Cadastro sem CPF — não é possível gerar cobrança real')
    if (!user.phone) throw new Error('Cadastro sem telefone — não é possível gerar cobrança real')

    const credentials = await getAsaasCredentials()
    const customerId = await getOrCreateAsaasCustomer(credentials, userId)

    let charge
    try {
      charge = await createAsaasPaymentWithCard(credentials, {
        customerId,
        value: Number(order.total),
        dueDate: dueDateFor('CREDIT_CARD'),
        externalReference: order.id,
        remoteIp,
        creditCard: card,
        creditCardHolderInfo: {
          name: user.name,
          email: user.email,
          cpfCnpj: user.cpf.replace(/\D/g, ''),
          postalCode: holderInfo.postalCode.replace(/\D/g, ''),
          addressNumber: holderInfo.addressNumber,
          addressComplement: holderInfo.addressComplement,
          phone: user.phone.replace(/\D/g, ''),
        },
        installmentCount: installments,
      })
    } catch (chargeError) {
      // Recusa de autorização (HTTP 400) — não é bug, é o banco recusando o
      // cartão. Mensagem já vem tratada por asaasErrorMessage (sem eco de
      // dado de cartão), segura pra mostrar direto pro cliente.
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
    if (insertPaymentError) throw new Error(`Falha ao salvar cobrança: ${insertPaymentError.message}`)

    // Cobrança com cartão autoriza na hora — não espera o webhook pra marcar
    // como pago (diferente do fluxo de invoiceUrl/Pix/boleto, que são
    // assíncronos por natureza). O webhook ainda chega depois e é idempotente
    // (asaas-webhook só transiciona se o pedido ainda estiver 'pending').
    const { error: statusError } = await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)
    if (statusError) throw new Error(`Falha ao atualizar status do pedido: ${statusError.message}`)
    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'paid',
      changed_by_name: 'Asaas (cartão)',
    })
    if (historyError) console.error('[asaas-charge-card] falha ao gravar order_status_history:', historyError.message)

    if (saveCard) {
      const { error: saveCardError } = await supabase.from('saved_credit_cards').insert({
        user_id: userId,
        credit_card_token: charge.creditCardToken,
        last_four_digits: charge.creditCardLastFour,
        brand: charge.creditCardBrand,
      })
      // Cobrança já foi aprovada e o pedido já está pago nesse ponto — falha
      // ao salvar o token pra reuso futuro não deve desfazer nada, só fica
      // registrada no log (mesmo princípio já usado no QR code Pix de
      // asaas-create-charge: falha em algo acessório não derruba o pedido).
      if (saveCardError) console.error('[asaas-charge-card] falha ao salvar cartão:', saveCardError.message)
    }

    return new Response(
      JSON.stringify({ orderId: order.id, status: charge.status, last4: charge.creditCardLastFour }),
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
