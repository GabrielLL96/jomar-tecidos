import { corsHeaders, createCallerClient, createServiceClient } from '../_shared/melhor-envio.ts'
import {
  sendAdminNewOrderNotification,
  sendOrderConfirmationEmail,
} from '../_shared/order-emails.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'

interface RequestBody {
  orderId: string
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

    // Não é dado financeiro, mas ainda é um endpoint que dispara envio real
    // via um serviço de terceiro — mesmo princípio de limite já aplicado nos
    // outros endpoints deste projeto (evita loop de retry do client virar
    // spam pro mesmo cliente).
    await enforceRateLimit(userId, 'send-order-confirmation-email', 5, 300)

    const { orderId } = (await req.json()) as RequestBody
    if (!orderId) throw new Error('orderId ausente')

    // Pedido precisa ser do próprio chamador — nunca confia em orderId+dono
    // vindos do client sem checar (mesmo princípio de asaas-create-charge).
    const supabase = createServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw new Error(`Falha ao ler pedido: ${orderError.message}`)
    if (!order || order.user_id !== userId) throw new Error('Pedido não encontrado')

    await sendOrderConfirmationEmail(orderId)

    // Best-effort: aviso interno pro admin nunca deve derrubar a confirmação
    // do cliente, que já foi enviada com sucesso nesse ponto.
    try {
      await sendAdminNewOrderNotification(orderId)
    } catch (adminEmailError) {
      console.error('Falha ao notificar admin de novo pedido:', adminEmailError)
    }

    return new Response(JSON.stringify({ sent: true }), {
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
