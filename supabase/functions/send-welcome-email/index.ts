import { corsHeaders, createCallerClient } from '../_shared/melhor-envio.ts'
import { sendWelcomeEmail } from '../_shared/user-emails.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'

// Sem body -- sempre manda pra si mesmo (nunca recebe userId do client, pra
// não virar um jeito de mandar e-mail arbitrário pra outro usuário).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')
    const caller = createCallerClient(authHeader)
    const { data: callerData, error: callerError } = await caller.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Sessão inválida')

    await enforceRateLimit(callerData.user.id, 'send-welcome-email', 5, 300)

    await sendWelcomeEmail(callerData.user.id)

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
