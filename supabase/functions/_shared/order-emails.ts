import { createServiceClient } from './melhor-envio.ts'
import { getResendCredentials, sendEmail } from './resend.ts'

// Mesmos rótulos de src/features/orders/data.ts (ORDER_STATUS_LABELS) —
// duplicado aqui de propósito: Edge Functions (Deno) não compartilham módulo
// com o bundle Vite (src/), e são só 6 valores fixos de um enum que já não
// muda com frequência (última mudança: 'refunded', 20260814000000).
const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Em preparação',
  shipping: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

// E-mail de status só existe pros status que representam uma mudança real
// depois da confirmação — 'pending' já tem seu próprio e-mail dedicado
// (sendOrderConfirmationEmail), não faria sentido mandar "seu pedido está
// aguardando pagamento" como notificação de mudança de status.
const STATUS_EMAIL_SUBJECT: Partial<Record<string, string>> = {
  paid: 'Pagamento confirmado',
  shipping: 'Pedido enviado',
  delivered: 'Pedido entregue',
  cancelled: 'Pedido cancelado',
  refunded: 'Pedido reembolsado',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Escapa o mínimo necessário pra interpolar texto vindo de dado real
// (nome de produto/cliente) dentro de um template HTML sem permitir
// injeção de markup — os únicos campos que chegam aqui vêm do próprio
// banco (nunca de input livre de visitante, diferente do formulário de
// contato), mas ainda assim nomes de produto podem ter caracteres como
// `&`/`<` em descrições futuras.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface OrderForEmail {
  id: string
  order_number: string
  status: string
  subtotal: number
  shipping_cost: number
  discount_total: number
  total: number
  created_at: string
  users: { name: string; email: string } | null
  order_items: {
    meters: number
    unit_price: number
    total: number
    products: { name: string } | null
    product_colors: { label: string } | null
  }[]
}

async function fetchOrderForEmail(orderId: string): Promise<OrderForEmail> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, status, subtotal, shipping_cost, discount_total, total, created_at,
       users (name, email),
       order_items (meters, unit_price, total, products (name), product_colors (label))`,
    )
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler pedido para e-mail: ${error.message}`)
  if (!data) throw new Error('Pedido não encontrado para envio de e-mail')
  return data as unknown as OrderForEmail
}

function itemsTableHtml(items: OrderForEmail['order_items']): string {
  const rows = items
    .map((item) => {
      const name = escapeHtml(item.products?.name ?? 'Produto')
      const color = item.product_colors?.label ? ` (${escapeHtml(item.product_colors.label)})` : ''
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e1d8;">${name}${color} — ${item.meters}m</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e1d8;text-align:right;">${currencyFormatter.format(Number(item.total))}</td>
      </tr>`
    })
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#2b2b2b;">${rows}</table>`
}

export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <h1 style="font-size:20px;color:#1c1a5e;margin:0 0 16px;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#8c8375;">Jomar Tecidos e Enxovais — Pouso Alegre, MG</p>
    </div>
  </body>
</html>`
}

// Releitura completa do pedido no servidor — nunca confia em conteúdo vindo
// do client (mesmo princípio já aplicado em create_order() pro unit_price).
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await fetchOrderForEmail(orderId)
  if (!order.users?.email) throw new Error('Pedido sem e-mail de cliente associado')

  const credentials = await getResendCredentials()
  const body = `
    <p style="font-size:14px;color:#2b2b2b;">Olá, ${escapeHtml(order.users.name)}! Recebemos seu pedido <strong>#${escapeHtml(order.order_number)}</strong> em ${dateFormatter.format(new Date(order.created_at))}.</p>
    ${itemsTableHtml(order.order_items)}
    <table style="width:100%;margin-top:16px;font-size:14px;color:#2b2b2b;">
      <tr><td>Subtotal</td><td style="text-align:right;">${currencyFormatter.format(Number(order.subtotal))}</td></tr>
      <tr><td>Frete</td><td style="text-align:right;">${currencyFormatter.format(Number(order.shipping_cost))}</td></tr>
      ${Number(order.discount_total) > 0 ? `<tr><td>Desconto</td><td style="text-align:right;">-${currencyFormatter.format(Number(order.discount_total))}</td></tr>` : ''}
      <tr style="font-weight:bold;"><td>Total</td><td style="text-align:right;">${currencyFormatter.format(Number(order.total))}</td></tr>
    </table>
    <p style="font-size:14px;color:#2b2b2b;">Você pode acompanhar o status a qualquer momento na sua conta.</p>
  `
  await sendEmail(
    credentials,
    {
      to: order.users.email,
      subject: `Pedido #${order.order_number} recebido`,
      html: emailLayout('Pedido recebido!', body),
    },
    { operation: 'order_confirmation', relatedEntity: 'orders', relatedEntityId: order.id },
  )
}

const DEFAULT_NOTIFICATION_EMAIL = 'contato@jomartecidos.com.br'

// Achado real: não existia NENHUM aviso pro admin de pedido novo — só o
// cliente recebia e-mail. Reusa resend_settings.contact_notification_email
// (mesmo campo já usado pelo formulário de contato), mesmo fallback padrão.
export async function sendAdminNewOrderNotification(orderId: string): Promise<void> {
  const order = await fetchOrderForEmail(orderId)
  const credentials = await getResendCredentials()
  const to = credentials.contactNotificationEmail || DEFAULT_NOTIFICATION_EMAIL

  const body = `
    <p style="font-size:14px;color:#2b2b2b;">Novo pedido <strong>#${escapeHtml(order.order_number)}</strong> em ${dateFormatter.format(new Date(order.created_at))}.</p>
    <p style="font-size:14px;color:#2b2b2b;"><strong>Cliente:</strong> ${escapeHtml(order.users?.name ?? 'Desconhecido')} (${escapeHtml(order.users?.email ?? '—')})</p>
    ${itemsTableHtml(order.order_items)}
    <table style="width:100%;margin-top:16px;font-size:14px;color:#2b2b2b;">
      <tr style="font-weight:bold;"><td>Total</td><td style="text-align:right;">${currencyFormatter.format(Number(order.total))}</td></tr>
    </table>
  `
  await sendEmail(
    credentials,
    {
      to,
      subject: `Novo pedido #${order.order_number}`,
      html: emailLayout('Novo pedido recebido', body),
    },
    {
      operation: 'admin_new_order_notification',
      relatedEntity: 'orders',
      relatedEntityId: order.id,
    },
  )
}

// Chamado tanto pela Edge Function admin-only (mudança manual de status)
// quanto direto (in-process, sem hop HTTP) de dentro do asaas-webhook após
// ele atualizar orders.status — nos dois casos relê o status ATUAL do banco,
// nunca recebe o status como parâmetro, pra nunca mandar e-mail de um status
// que não corresponde ao que está realmente salvo.
export async function sendOrderStatusEmail(orderId: string): Promise<void> {
  const order = await fetchOrderForEmail(orderId)
  if (!order.users?.email) throw new Error('Pedido sem e-mail de cliente associado')

  const subjectLabel = STATUS_EMAIL_SUBJECT[order.status]
  if (!subjectLabel) return // 'pending' (e qualquer status futuro sem mapeamento) não dispara e-mail aqui

  const credentials = await getResendCredentials()
  const body = `
    <p style="font-size:14px;color:#2b2b2b;">Olá, ${escapeHtml(order.users.name)}! O status do seu pedido <strong>#${escapeHtml(order.order_number)}</strong> mudou para <strong>${STATUS_LABELS[order.status] ?? order.status}</strong>.</p>
    <p style="font-size:14px;color:#2b2b2b;">Total do pedido: ${currencyFormatter.format(Number(order.total))}</p>
  `
  await sendEmail(
    credentials,
    {
      to: order.users.email,
      subject: `Pedido #${order.order_number}: ${subjectLabel}`,
      html: emailLayout(subjectLabel, body),
    },
    {
      operation: 'order_status_change',
      relatedEntity: 'orders',
      relatedEntityId: order.id,
      requestSummary: { status: order.status },
    },
  )
}
