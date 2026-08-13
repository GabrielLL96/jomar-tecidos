import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPriceBRL } from '@/lib/format'
import { useBusinessInfo } from '@/features/site-settings/hooks'
import { useCart } from '@/features/cart/CartContext'
import { useProducts } from '@/features/catalog/hooks'
import { useShippingQuote } from '@/features/melhor-envio/useShippingQuote'

export function CartPage() {
  const { items, subtotal, updateMeters, removeItem } = useCart()
  const business = useBusinessInfo()
  const navigate = useNavigate()
  const { data: products = [] } = useProducts()

  const [zip, setZip] = useState('')
  const isFreeShipping = subtotal >= business.freeShippingThreshold

  const {
    options: shippingOptions,
    isCalculating: isCalculatingShipping,
    error: shippingQuoteError,
    missingData: cartItemsMissingShippingData,
  } = useShippingQuote(zip, items, products, !isFreeShipping)

  const cheapestShippingPrice =
    shippingOptions.length > 0 ? Math.min(...shippingOptions.map((option) => option.price)) : null
  // No carrinho é só simulação (sem login ainda) — mostra a opção mais barata
  // cotada, ou a taxa fixa como estimativa enquanto não tem CEP. A escolha
  // real de transportadora acontece no checkout.
  const shipping = isFreeShipping ? 0 : (cheapestShippingPrice ?? business.flatShippingFee)
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
              <ImagePlaceholder
                colors={item.stripeColors}
                src={item.coverImageUrl}
                alt={item.name}
                className="size-24 shrink-0 rounded-sm"
              />
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
          {!isFreeShipping && (
            <div className="mb-3">
              <Label htmlFor="cart-zip" className="text-text-body text-sm font-normal">
                Calcular frete
              </Label>
              <Input
                id="cart-zip"
                placeholder="00000-000"
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                className="mt-1.5 h-9 text-sm"
                maxLength={9}
              />
              {cartItemsMissingShippingData ? null : isCalculatingShipping ? (
                <p className="text-text-meta mt-1.5 text-xs">Calculando frete…</p>
              ) : shippingQuoteError ? (
                <p className="text-destructive mt-1.5 text-xs">{shippingQuoteError}</p>
              ) : (
                shippingOptions.length > 0 && (
                  <p className="text-navy mt-1.5 text-xs">
                    A partir de {formatPriceBRL(cheapestShippingPrice ?? 0)}
                  </p>
                )
              )}
            </div>
          )}
          <div className="text-text-body mb-3 flex justify-between text-sm">
            <span>Frete</span>
            <span>
              {shipping === 0 ? 'Grátis' : formatPriceBRL(shipping)}
              {!isFreeShipping && shippingOptions.length === 0 && ' (estimado)'}
            </span>
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
