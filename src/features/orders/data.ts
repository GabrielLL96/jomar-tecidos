import type { DeliveryStatus, OrderStatus } from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Em preparação',
  shipping: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[#f2ede4] text-[#8c8375]',
  paid: 'bg-[#f2ede4] text-[#8c8375]',
  shipping: 'bg-[#e6e4ee] text-[#1c1a5e]',
  delivered: 'bg-[#e3ecec] text-[#2f6b5e]',
  cancelled: 'bg-[#f2e4e4] text-[#8c3d3d]',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  awaiting_pickup: 'Aguardando coleta',
  in_transit: 'A caminho',
  delivered: 'Entregue',
  delayed: 'Atrasado',
}
