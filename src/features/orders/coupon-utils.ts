import { formatPriceBRL } from '@/lib/format'
import type { Coupon, CouponStatus } from './types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export function findCoupon(code: string, coupons: Coupon[]): Coupon | null {
  const normalized = code.trim().toUpperCase()
  return coupons.find((coupon) => coupon.code === normalized) ?? null
}

// `status` guardado no banco é só a intenção manual do admin (ativo, ou
// desligado antes da hora via expired/depleted) — nunca reflete sozinho se o
// cupom está de fato utilizável agora. Essa function é a única fonte de
// verdade pro status "efetivo": expired/depleted manuais são respeitados
// como decisão explícita do admin; qualquer outro caso é recalculado a
// partir de expires_at/starts_at/uso real. Sem isso, a badge "Ativo" podia
// mentir (cupom já vencido/esgotado ainda mostrando verde) e "Agendado" não
// tinha nenhum campo de data por trás — era um rótulo que nunca virava
// "Ativo" sozinho.
export function computeCouponStatus(coupon: Coupon, now: Date = new Date()): CouponStatus {
  if (coupon.status === 'expired' || coupon.status === 'depleted') return coupon.status
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return 'expired'
  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) return 'depleted'
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 'scheduled'
  return 'active'
}

export function isCouponValid(coupon: Coupon): boolean {
  return computeCouponStatus(coupon) === 'active'
}

export function couponValidityLabel(coupon: Coupon): string {
  const starts = coupon.startsAt ? dateFormatter.format(new Date(coupon.startsAt)) : null
  const expires = coupon.expiresAt ? dateFormatter.format(new Date(coupon.expiresAt)) : null
  if (starts && expires) return `${starts} – ${expires}`
  if (starts) return `A partir de ${starts}`
  if (expires) return expires
  return 'Sem validade'
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

// `expires_at` é `timestamptz` — mandar a string "YYYY-MM-DD" nua faz o
// Postgres interpretar como meia-noite UTC, expirando o cupom ~3h mais cedo
// em fuso do Brasil (mesma família de bug já documentada em _Feedback.md).
// Construir a partir de componentes locais (não `new Date(string)`/ISO nu)
// garante que o instante final seja 23:59:59 do dia escolhido, no fuso local.
export function endOfDayLocalISOString(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59).toISOString()
}

// Mesmo raciocínio de endOfDayLocalISOString, pra "válido a partir de" —
// início do dia escolhido no fuso local, não meia-noite UTC.
export function startOfDayLocalISOString(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0).toISOString()
}
