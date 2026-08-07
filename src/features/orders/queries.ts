import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DeliveryStatus, Order, OrderItem } from './types'

const ORDER_SELECT = `
  id, order_number, status, payment_method, subtotal, shipping_cost, discount_total, total,
  coupon_id, shipping_address_id, cancel_reason, created_at, user_id,
  users(name, email, phone),
  addresses(label, street, city, state, zip_code),
  order_items(id, product_id, color_id, meters, unit_price, total, products(name), product_colors(label)),
  deliveries(id, order_id, carrier, tracking_code, tracking_url, status, eta_date),
  order_status_history(id, status, changed_by_name, created_at)
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
