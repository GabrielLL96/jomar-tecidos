export type OrderStatus = 'pending' | 'paid' | 'shipping' | 'delivered' | 'cancelled'
export type PaymentMethod = 'credit_card' | 'pix' | 'boleto'
export type DeliveryStatus = 'awaiting_pickup' | 'in_transit' | 'delivered' | 'delayed'
export type CouponType = 'percentage' | 'fixed' | 'free_shipping'
export type CouponStatus = 'active' | 'scheduled' | 'expired' | 'depleted'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  colorId?: string
  colorLabel?: string
  meters: number
  unitPrice: number
  total: number
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  subtotal: number
  shippingCost: number
  discountTotal: number
  total: number
  couponId?: string
  shippingAddressId: string
  items: OrderItem[]
  createdAt: string
}

export interface Delivery {
  id: string
  orderId: string
  carrier: string
  trackingCode: string
  status: DeliveryStatus
  etaDate: string
}

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  maxUses?: number
  usedCount: number
  expiresAt?: string
  status: CouponStatus
}
