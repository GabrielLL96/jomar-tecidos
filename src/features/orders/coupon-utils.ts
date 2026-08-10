import { formatPriceBRL } from '@/lib/format'
import type { Coupon } from './types'

export function findCoupon(code: string, coupons: Coupon[]): Coupon | null {
  const normalized = code.trim().toUpperCase()
  return coupons.find((coupon) => coupon.code === normalized) ?? null
}

export function isCouponValid(coupon: Coupon): boolean {
  if (coupon.status !== 'active') return false
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return false
  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) return false
  return true
}

export function calculateDiscount(coupon: Coupon, subtotal: number, shippingCost: number): number {
  if (coupon.type === 'percentage') return subtotal * (coupon.value / 100)
  if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal)
  if (coupon.type === 'free_shipping') return shippingCost
  return 0
}

export function couponValueLabel(type: Coupon['type'], value: number): string {
  if (type === 'percentage') return `${value}%`
  if (type === 'free_shipping') return 'Grátis'
  return formatPriceBRL(value)
}
