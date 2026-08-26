import { corsHeaders } from '../_shared/melhor-envio.ts'
import { getClientIp } from '../_shared/asaas.ts'
import { getResendCredentials, sendEmail } from '../_shared/resend.ts'
import { enforceRateLimitByIp } from '../_shared/rate-limit.ts'

interface ContactRequestBody {
  name: string
  email: string
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_NOTIFICATION_EMAIL = 'contato@jomartecidos.com.br'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Endpoint público (formulário de /contato não exige login) — sem JWT pra
// checar, então a única defesa contra abuso é rate limit por IP + validação
// de formato. `to` NUNCA vem do client (sempre o e-mail da própria loja,
// lido de resend_settings) e `from` é sempre o domínio verificado — o
// e-mail do visitante só entra como reply-to, nunca como remetente (evita
// que este endpoint vire um relay de e-mail arbitrário).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const clientIp = getClientIp(req)
    await enforceRateLimitByIp(clientIp, 'send-contact-email', 5, 600)

    const { name, email, message } = (await req.json()) as ContactRequestBody
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      throw new Error('Preencha nome, e-mail e mensagem')
    }
    if (!EMAIL_PATTERN.test(email.trim())) throw new Error('E-mail inválido')
    if (message.length > 5000) throw new Error('Mensagem muito longa')

    const credentials = await getResendCredentials()
    const to = credentials.contactNotificationEmail || DEFAULT_NOTIFICATION_EMAIL

    const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <h1 style="font-size:20px;color:#1c1a5e;margin:0 0 16px;">Nova mensagem de contato</h1>
      <p style="font-size:14px;color:#2b2b2b;"><strong>Nome:</strong> ${escapeHtml(name.trim())}</p>
      <p style="font-size:14px;color:#2b2b2b;"><strong>E-mail:</strong> ${escapeHtml(email.trim())}</p>
      <p style="font-size:14px;color:#2b2b2b;white-space:pre-wrap;">${escapeHtml(message.trim())}</p>
    </div>
  </body>
</html>`

    await sendEmail(
      credentials,
      { to, subject: `Contato do site — ${name.trim()}`, html, replyTo: email.trim() },
      { operation: 'contact_form', relatedEntity: 'contact' },
    )

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
