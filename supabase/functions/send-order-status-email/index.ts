import { corsHeaders, requireAdmin } from '../_shared/melhor-envio.ts'
import { sendOrderStatusEmail } from '../_shared/order-emails.ts'

interface RequestBody {
  orderId: string
}

// Admin-only — mesmo gate de acesso da própria tela que chama isso
// (/admin/vendas/:id, atrás de AdminLayout com role === 'admin', ver
// ADR-011: gate do painel continua binário). O webhook da Asaas NÃO passa
// por aqui — chama sendOrderStatusEmail() direto (in-process), sem HTTP.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const { orderId } = (await req.json()) as RequestBody
    if (!orderId) throw new Error('orderId ausente')

    await sendOrderStatusEmail(orderId)

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
