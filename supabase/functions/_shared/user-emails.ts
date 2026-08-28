import { createServiceClient } from './melhor-envio.ts'
import { getResendCredentials, sendEmail } from './resend.ts'
import { emailLayout, escapeHtml } from './order-emails.ts'

// enable_confirmations = false (config.toml) -- signup nao passa por
// confirmacao de e-mail, entao nao existia NENHUM e-mail de conta nova ate
// aqui (achado real: usuario perguntou se existia, resposta era nao).
export async function sendWelcomeEmail(userId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler usuário para e-mail: ${error.message}`)
  if (!user?.email) throw new Error('Usuário sem e-mail associado')

  const credentials = await getResendCredentials()
  const body = `
    <p style="font-size:14px;color:#2b2b2b;line-height:1.6;">Olá, ${escapeHtml(user.name)}! Sua conta na Jomar Tecidos e Enxovais foi criada com sucesso.</p>
    <p style="font-size:14px;color:#2b2b2b;line-height:1.6;">A partir de agora você pode acompanhar seus pedidos, salvar endereços e favoritar tecidos direto na sua conta.</p>
    <table role="presentation" style="margin:24px 0 0;">
      <tr>
        <td style="border-radius:6px;background:#1c1a5e;">
          <a href="https://jomartecidos.com.br/conta" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
            Ver minha conta
          </a>
        </td>
      </tr>
    </table>
  `
  await sendEmail(
    credentials,
    {
      to: user.email,
      subject: 'Bem-vindo à Jomar Tecidos e Enxovais!',
      html: emailLayout('Conta criada com sucesso!', body),
    },
    { operation: 'welcome', relatedEntity: 'users', relatedEntityId: userId },
  )
}
