import { BUSINESS } from '@/lib/constants'
import { formatPriceBRL } from '@/lib/format'

export function UtilityBar() {
  return (
    <div className="bg-navy-dark flex items-center justify-between gap-4 px-6 py-2 text-[12px] tracking-[0.04em] text-white/90 md:px-12">
      <span>Frete grátis para compras acima de {formatPriceBRL(BUSINESS.freeShippingThreshold)}</span>
      <span className="hidden sm:inline">
        Tel. {BUSINESS.phone} · {BUSINESS.hours}
      </span>
    </div>
  )
}
