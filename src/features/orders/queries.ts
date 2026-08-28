import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Coupon, DeliveryStatus, Order, OrderItem, OrderPaymentStatus } from './types'

const ORDER_SELECT = `
  id, order_number, status, payment_method, subtotal, shipping_cost, discount_total, total,
  coupon_id, shipping_address_id, cancel_reason, created_at, user_id,
  users(name, email, phone),
  addresses(label, street, city, state, zip_code),
  order_items(id, product_id, color_id, meters, unit_price, total, products(name), product_colors(label)),
  deliveries(id, order_id, carrier, tracking_code, tracking_url, status, eta_date),
  order_status_history(id, status, changed_by_name, created_at),
  order_payments(id, status, payment_method, amount, pix_qr_code, pix_copy_paste, pix_expiration, boleto_url, boleto_barcode, invoice_url, due_date, confirmed_at, created_at, installment_count),
  refunds(id, amount, reason, requested_by_name, created_at)
`

interface OrderRow {
  id: string
  order_number: string
  status: Order['status']
  payment_method: Order['paymentMethod']
  subtotal: number
  shipping_cost: number
  discount_total: number
  total: number
  coupon_id: string | null
  shipping_address_id: string
  cancel_reason: string | null
  created_at: string
  user_id: string
  users: { name: string; email: string; phone: string | null } | null
  addresses: { label: string; street: string; city: string; state: string; zip_code: string } | null
  order_items: {
    id: string
    product_id: string
    color_id: string | null
    meters: number
    unit_price: number
    total: number
    products: { name: string } | null
    product_colors: { label: string } | null
  }[]
  // one-to-one (deliveries.order_id é unique) — o Postgrest retorna objeto
  // único ou null aqui, nunca array, diferente de order_items/order_status_history.
  deliveries: {
    id: string
    order_id: string
    carrier: string | null
    tracking_code: string | null
    tracking_url: string | null
    status: string
    eta_date: string | null
  } | null
  order_status_history: {
    id: string
    status: Order['status']
    changed_by_name: string
    created_at: string
  }[]
  // 1:N de verdade (FK order_id não é unique) mesmo só existindo 1 linha por
  // pedido na prática hoje ("uma cobrança por pedido", ver spec) — tratar
  // como array evita repetir o bug já documentado neste projeto de assumir
  // objeto único numa relação que o Postgrest só garante 1:1 quando a FK tem
  // constraint unique de verdade.
  order_payments: {
    id: string
    status: OrderPaymentStatus
    payment_method: Order['paymentMethod']
    amount: number
    pix_qr_code: string | null
    pix_copy_paste: string | null
    pix_expiration: string | null
    boleto_url: string | null
    boleto_barcode: string | null
    invoice_url: string | null
    due_date: string | null
    confirmed_at: string | null
    created_at: string
    installment_count: number
  }[]
  refunds: {
    id: string
    amount: number
    reason: string
    requested_by_name: string
    created_at: string
  }[]
}

function adaptOrder(row: OrderRow): Order {
  const items: OrderItem[] = row.order_items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    productName: item.products?.name ?? 'Produto removido',
    colorId: item.color_id ?? undefined,
    colorLabel: item.product_colors?.label ?? undefined,
    meters: Number(item.meters),
    unitPrice: Number(item.unit_price),
    total: Number(item.total),
  }))

  const deliveryRow = row.deliveries
  const latestPayment = [...row.order_payments].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0]

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost),
    discountTotal: Number(row.discount_total),
    total: Number(row.total),
    couponId: row.coupon_id ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    shippingAddressId: row.shipping_address_id,
    shippingAddress: row.addresses
      ? {
          label: row.addresses.label,
          street: row.addresses.street,
          city: row.addresses.city,
          state: row.addresses.state,
          zipCode: row.addresses.zip_code,
        }
      : undefined,
    customerName: row.users?.name,
    customerEmail: row.users?.email,
    customerPhone: row.users?.phone ?? undefined,
    items,
    delivery: deliveryRow
      ? {
          id: deliveryRow.id,
          orderId: deliveryRow.order_id,
          carrier: deliveryRow.carrier ?? undefined,
          trackingCode: deliveryRow.tracking_code ?? undefined,
          trackingUrl: deliveryRow.tracking_url ?? undefined,
          status: deliveryRow.status as DeliveryStatus,
          etaDate: deliveryRow.eta_date ?? undefined,
        }
      : undefined,
    statusHistory: [...row.order_status_history]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((entry) => ({
        id: entry.id,
        status: entry.status,
        changedByName: entry.changed_by_name,
        createdAt: entry.created_at,
      })),
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          paymentMethod: latestPayment.payment_method,
          amount: Number(latestPayment.amount),
          pixQrCode: latestPayment.pix_qr_code ?? undefined,
          pixCopyPaste: latestPayment.pix_copy_paste ?? undefined,
          pixExpiration: latestPayment.pix_expiration ?? undefined,
          boletoUrl: latestPayment.boleto_url ?? undefined,
          boletoBarcode: latestPayment.boleto_barcode ?? undefined,
          invoiceUrl: latestPayment.invoice_url ?? undefined,
          dueDate: latestPayment.due_date ?? undefined,
          confirmedAt: latestPayment.confirmed_at ?? undefined,
          installmentCount: latestPayment.installment_count,
        }
      : undefined,
    refunds: [...row.refunds]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((refund) => ({
        id: refund.id,
        amount: Number(refund.amount),
        reason: refund.reason,
        requestedByName: refund.requested_by_name,
        createdAt: refund.created_at,
      })),
    createdAt: row.created_at,
  }
}

export const adminOrdersQueryOptions = queryOptions({
  queryKey: ['orders', 'admin'] as const,
  queryFn: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as unknown as OrderRow[]).map(adaptOrder)
  },
  staleTime: 30 * 1000,
})

export const myOrdersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['orders', 'mine', userId] as const,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data as unknown as OrderRow[]).map(adaptOrder)
    },
    staleTime: 30 * 1000,
    enabled: Boolean(userId),
  })

export const adminCouponsQueryOptions = queryOptions({
  queryKey: ['coupons', 'admin'] as const,
  queryFn: async (): Promise<Coupon[]> => {
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, type, value, max_uses, used_count, starts_at, expires_at, status')
      .order('code', { ascending: true })
    if (error) throw new Error(error.message)
    return data.map((row) => ({
      id: row.id,
      code: row.code,
      type: row.type,
      value: Number(row.value),
      maxUses: row.max_uses ?? undefined,
      usedCount: row.used_count,
      startsAt: row.starts_at ?? undefined,
      expiresAt: row.expires_at ?? undefined,
      status: row.status,
    }))
  },
  staleTime: 30 * 1000,
})

export const orderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['orders', id] as const,
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ? adaptOrder(data as unknown as OrderRow) : null
    },
    staleTime: 30 * 1000,
    enabled: Boolean(id),
  })
