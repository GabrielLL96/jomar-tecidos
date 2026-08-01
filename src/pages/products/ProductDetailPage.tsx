import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPriceBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useProduct } from '@/features/catalog/hooks'
import { PRODUCT_CARE_DEFAULT, PRODUCT_DELIVERY_DEFAULT } from '@/features/catalog/data'
import { useCart } from '@/features/cart/CartContext'
import { useFavorites } from '@/features/favorites/FavoritesContext'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { data: product, isLoading } = useProduct(slug)
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()

  const [selectedColorIdx, setSelectedColorIdx] = useState(0)
  const [meters, setMeters] = useState(2)

  if (isLoading) return null

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-(--breakpoint-md) px-6 py-20 text-center">
        <p className="text-text-body">Tecido não encontrado.</p>
        <Link to="/tecidos" className="text-navy mt-4 inline-block text-sm font-semibold">
          Voltar para a coleção
        </Link>
      </main>
    )
  }

  const selectedColor = product.colorOptions[selectedColorIdx]
  const subtotal = product.price * meters
  const favorite = isFavorite(product.id)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorLabel: selectedColor.label,
      colorHex: selectedColor.hex,
      stripeColors: product.colors,
      meters,
      pricePerMeter: product.price,
    })
    toast.success(`${product.name} adicionado à sacola`)
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-10 md:px-12">
      <div className="text-text-meta mb-6 text-[12.5px]">
        <Link to="/">Início</Link> / <Link to="/tecidos">Tecidos</Link> / {product.name}
      </div>

      <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
        <div>
          <ImagePlaceholder
            colors={[selectedColor.hex, product.colors[1]]}
            className="mb-3.5 h-[420px] rounded-sm md:h-[480px]"
          />
          <div className="flex gap-3">
            {product.colorOptions.map((option, index) => (
              <button
                key={option.label}
                type="button"
                aria-label={`Ver na cor ${option.label}`}
                onClick={() => setSelectedColorIdx(index)}
                style={{ backgroundColor: option.hex }}
                className={cn(
                  'size-[88px] rounded-sm',
                  index === selectedColorIdx && 'ring-navy ring-2 ring-offset-2',
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-brand-red mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {product.material}
          </div>
          <h1 className="text-navy-dark mb-3 font-serif text-[32px] font-medium">{product.name}</h1>
          <div className="mb-5 text-[22px] font-medium">
            {formatPriceBRL(product.price)}{' '}
            <span className="text-text-meta text-[13px] font-normal">/ metro</span>
          </div>
          <p className="text-text-body mb-6 text-[14.5px] leading-relaxed">{product.description}</p>

          <div className="mb-5">
            <div className="text-navy-dark mb-2.5 text-[12.5px] font-semibold">
              Cor: {selectedColor.label}
            </div>
            <div className="flex gap-2.5">
              {product.colorOptions.map((option, index) => (
                <button
                  key={option.label}
                  type="button"
                  aria-label={option.label}
                  onClick={() => setSelectedColorIdx(index)}
                  style={{ backgroundColor: option.hex }}
                  className={cn(
                    'size-[34px] rounded-full',
                    index === selectedColorIdx
                      ? 'ring-navy ring-2 ring-offset-2'
                      : 'ring-input ring-1',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-navy-dark mb-2.5 text-[12.5px] font-semibold">Quantidade (metros)</div>
            <div className="border-input flex w-fit items-center rounded-sm border">
              <button
                type="button"
                aria-label="Diminuir metragem"
                onClick={() => setMeters((value) => Math.max(1, value - 1))}
                className="flex h-11 w-10 items-center justify-center"
              >
                <Minus className="size-4" />
              </button>
              <div className="w-14 text-center text-[15px]">{meters}m</div>
              <button
                type="button"
                aria-label="Aumentar metragem"
                onClick={() => setMeters((value) => value + 1)}
                className="flex h-11 w-10 items-center justify-center"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="mb-7 flex gap-3.5">
            <Button onClick={handleAddToCart} size="lg" className="h-auto flex-1 rounded-sm px-6 py-4 text-[14.5px]">
              Adicionar à sacola — {formatPriceBRL(subtotal)}
            </Button>
            <button
              type="button"
              aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onClick={() => toggleFavorite(product.id)}
              className={cn(
                'border-input flex size-14 items-center justify-center rounded-sm border',
                favorite && 'text-brand-red',
              )}
            >
              <Heart className="size-[18px]" fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <Tabs defaultValue="composicao" className="border-border border-t pt-5">
            <TabsList>
              <TabsTrigger value="composicao">Composição</TabsTrigger>
              <TabsTrigger value="entrega">Entrega</TabsTrigger>
              <TabsTrigger value="cuidados">Cuidados</TabsTrigger>
            </TabsList>
            <TabsContent value="composicao" className="text-text-body text-[13px] leading-relaxed">
              {product.composition}
            </TabsContent>
            <TabsContent value="entrega" className="text-text-body text-[13px] leading-relaxed">
              {PRODUCT_DELIVERY_DEFAULT}
            </TabsContent>
            <TabsContent value="cuidados" className="text-text-body text-[13px] leading-relaxed">
              {PRODUCT_CARE_DEFAULT}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
