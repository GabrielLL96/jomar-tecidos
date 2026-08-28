import type { CouponStatus, CouponType, DeliveryStatus, OrderStatus, PaymentMethod } from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Em preparação',
  shipping: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[#f2ede4] text-[#8c8375]',
  paid: 'bg-[#f2ede4] text-[#8c8375]',
  shipping: 'bg-[#e6e4ee] text-[#1c1a5e]',
  delivered: 'bg-[#e3ecec] text-[#2f6b5e]',
  cancelled: 'bg-[#f2e4e4] text-[#8c3d3d]',
  refunded: 'bg-[#f2e4e4] text-[#8c3d3d]',
}

export const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  awaiting_pickup: 'Aguardando coleta',
  in_transit: 'A caminho',
  delivered: 'Entregue',
  delayed: 'Atrasado',
}

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percentage: 'Percentual',
  fixed: 'Valor fixo',
  free_shipping: 'Frete grátis',
}

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  active: 'Ativo',
  scheduled: 'Agendado',
  expired: 'Expirado',
  depleted: 'Esgotado',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
}

// Compartilhado entre a visão de admin (AdminSalesOrderDetailPage) e a visão
// do cliente (ConfirmationPage) — mesmo stepper visual dos dois lados, pra
// não divergir silenciosamente se um mudar sem o outro.
export const PROGRESS_STEPS = ['Aguardando', 'Pago', 'Preparando', 'Enviado', 'Entregue']

// "paid" nesse app já significa "em preparação" (não existe status separado
// pra isso) — por isso cobre duas etapas do stepper de uma vez.
export function progressStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0
    case 'paid':
      return 2
    case 'shipping':
      return 3
    case 'delivered':
      return 4
    default:
      return -1
  }
}

export const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending:
    'Aguardando confirmação de pagamento pela Asaas — status muda sozinho quando o webhook confirmar.',
  paid: 'Pagamento confirmado — pedido em preparação.',
  shipping: 'Pedido a caminho do cliente.',
  delivered: 'Pedido entregue com sucesso.',
  cancelled: 'Pedido cancelado.',
  refunded: 'Pedido reembolsado.',
}
