import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'
import type { CartItem } from '@/features/cart/types'
import { MOCK_DELIVERIES, MOCK_ORDERS } from './data'
import type { Delivery, Order, PaymentMethod } from './types'

const ORDERS_STORAGE_KEY = 'jomar:orders'
const DELIVERIES_STORAGE_KEY = 'jomar:deliveries'
const DELIVERY_CARRIERS = ['Correios', 'Jadlog'] as const

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface CreateOrderInput {
  items: CartItem[]
  paymentMethod: PaymentMethod
  shippingAddressId: string
  subtotal: number
  shippingCost: number
  discountTotal: number
  total: number
  couponId?: string
}

interface OrdersContextValue {
  orders: Order[]
  getDelivery: (orderId: string) => Delivery | undefined
  createOrder: (input: CreateOrderInput) => Order
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

function generateOrderNumber() {
  return `JT-${Math.floor(1000 + Math.random() * 9000)}`
}

function generateTrackingCode() {
  return `BR${Math.floor(100000000 + Math.random() * 900000000)}BR`
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [orders, setOrders] = useState<Order[]>(() => getItem<Order[]>(ORDERS_STORAGE_KEY, null) ?? MOCK_ORDERS)
  const [deliveries, setDeliveries] = useState<Delivery[]>(
    () => getItem<Delivery[]>(DELIVERIES_STORAGE_KEY, null) ?? MOCK_DELIVERIES,
  )

  const getDelivery: OrdersContextValue['getDelivery'] = (orderId) =>
    deliveries.find((delivery) => delivery.orderId === orderId)

  const createOrder: OrdersContextValue['createOrder'] = (input) => {
    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: generateOrderNumber(),
      status: 'paid',
      paymentMethod: input.paymentMethod,
      subtotal: input.subtotal,
      shippingCost: input.shippingCost,
      discountTotal: input.discountTotal,
      total: input.total,
      couponId: input.couponId,
      shippingAddressId: input.shippingAddressId,
      createdAt: toDateOnly(new Date()),
      items: input.items.map((item) => ({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: item.name,
        colorId: item.colorId,
        colorLabel: item.colorLabel,
        meters: item.meters,
        unitPrice: item.pricePerMeter,
        total: item.meters * item.pricePerMeter,
      })),
    }

    const eta = new Date()
    eta.setDate(eta.getDate() + 5)

    const delivery: Delivery = {
      id: crypto.randomUUID(),
      orderId: order.id,
      carrier: DELIVERY_CARRIERS[Math.floor(Math.random() * DELIVERY_CARRIERS.length)],
      trackingCode: generateTrackingCode(),
      status: 'awaiting_pickup',
      etaDate: toDateOnly(eta),
    }

    const nextOrders = [order, ...orders]
    const nextDeliveries = [...deliveries, delivery]
    setOrders(nextOrders)
    setDeliveries(nextDeliveries)
    setItem(ORDERS_STORAGE_KEY, nextOrders)
    setItem(DELIVERIES_STORAGE_KEY, nextDeliveries)

    return order
  }

  return (
    <OrdersContext.Provider value={{ orders, getDelivery, createOrder }}>{children}</OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) throw new Error('useOrders deve ser usado dentro de um OrdersProvider')
  return context
}
