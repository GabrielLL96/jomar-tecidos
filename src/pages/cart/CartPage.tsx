import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { formatPriceBRL } from '@/lib/format'
import { BUSINESS } from '@/lib/constants'
import { useCart } from '@/features/cart/CartContext'

export function CartPage() {
  const { items, subtotal, updateMeters, removeItem } = useCart()
  const navigate = useNavigate()

  const shipping = subtotal >= BUSINESS.freeShippingThreshold ? 0 : BUSINESS.flatShippingFee
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-(--breakpoint-md) px-6 py-20 text-center">
        <h1 className="text-navy-dark mb-4 font-serif text-3xl font-medium">Sua sacola está vazia</h1>
        <Link to="/tecidos">
          <Button size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
            Ver coleção
          </Button>
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-lg) px-6 py-10 md:px-12">
      <h1 className="text-navy-dark mb-8 font-serif text-3xl font-medium">Sua sacola</h1>

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_340px]">
        <div>
          {items.map((item) => (
            <div key={item.id} className="border-border flex gap-5 border-b py-5">
              <ImagePlaceholder colors={item.stripeColors} className="size-24 shrink-0 rounded-sm" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <div>
                    <div className="text-base font-medium">{item.name}</div>
                    <div className="text-text-meta mt-0.5 text-xs">
                      {item.colorLabel} · {item.meters}m
                    </div>
                  </div>
                  <div className="text-navy text-base font-medium">
                    {formatPriceBRL(item.meters * item.pricePerMeter)}
                  </div>
                </div>
                <div className="mt-3.5 flex items-center gap-4">
                  <div className="border-input flex items-center rounded-sm border">
                    <button
                      type="button"
                      aria-label="Diminuir metragem"
                      onClick={() => updateMeters(item.id, item.meters - 1)}
                      className="flex size-8 items-center justify-center"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <div className="w-10 text-center text-sm">{item.meters}m</div>
                    <button
                      type="button"
                      aria-label="Aumentar metragem"
                      onClick={() => updateMeters(item.id, item.meters + 1)}
                      className="flex size-8 items-center justify-center"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-text-meta text-xs"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cream-secondary rounded-sm p-7">
          <div className="text-navy-dark mb-5 text-base font-semibold">Resumo do pedido</div>
          <div className="text-text-body mb-3 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPriceBRL(subtotal)}</span>
          </div>
          <div className="text-text-body mb-3 flex justify-between text-sm">
            <span>Frete</span>
            <span>{shipping === 0 ? 'Grátis' : formatPriceBRL(shipping)}</span>
          </div>
          <div className="text-navy-dark border-border mt-2 flex justify-between border-t pt-4 text-base font-semibold">
            <span>Total</span>
            <span>{formatPriceBRL(total)}</span>
          </div>
          <Button
            onClick={() => navigate('/checkout')}
            size="lg"
            className="mt-5 h-auto w-full rounded-sm py-4 text-sm"
          >
            Finalizar compra
          </Button>
        </div>
      </div>
    </main>
  )
}
