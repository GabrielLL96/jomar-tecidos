import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart, Minus, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPriceBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCompositions, useProduct, useProductReviews } from '@/features/catalog/hooks'
import { PRODUCT_CARE_DEFAULT, PRODUCT_DELIVERY_DEFAULT } from '@/features/catalog/data'
import { formatCompositionBreakdown, formatCompositionLabel, formatWidthM } from '@/features/catalog/utils'
import { useCart } from '@/features/cart/CartContext'
import { useFavorites } from '@/features/favorites/FavoritesContext'
import { useProductJsonLd, useSeoMeta } from '@/lib/seo'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { data: product, isLoading } = useProduct(slug)
  const { data: reviews = [] } = useProductReviews(product?.id ?? '')
  const { data: compositions = [] } = useCompositions()
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()

  // Hook precisa rodar sempre (Rules of Hooks) — mesmo antes do produto
  // carregar, com fallback razoável.
  useSeoMeta({
    title: product?.name ?? 'Tecido',
    description: product
      ? `${product.description.slice(0, 140)} — R$ ${product.pricePerMeter.toFixed(2).replace('.', ',')}/metro na Jomar Tecidos.`
      : 'Confira este tecido no catálogo da Jomar Tecidos e Enxovais.',
    path: `/tecidos/${slug}`,
    image: product?.images[0]?.url,
    type: 'product',
  })

  useProductJsonLd(
    product
      ? {
          name: product.name,
          description: product.description,
          sku: product.sku,
          slug: product.slug,
          image: product.images.map((image) => image.url),
          priceBRL: product.pricePerMeter,
          inStock: product.status !== 'out_of_stock',
          ratingValue: reviews.length
            ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
            : undefined,
          reviewCount: reviews.length || undefined,
        }
      : null,
  )

  const [selectedColorIdx, setSelectedColorIdx] = useState(0)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
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
  const subtotal = product.pricePerMeter * meters
  const favorite = isFavorite(product.id)
  const outOfStock = product.status === 'out_of_stock'
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : null

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorId: selectedColor.id,
      colorLabel: selectedColor.label,
      colorHex: selectedColor.hex,
      stripeColors: product.colors,
      coverImageUrl: product.images[0]?.url,
      meters,
      pricePerMeter: product.pricePerMeter,
    })
    toast.success(`${product.name} adicionado à sacola`)
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-10 md:px-12">
      <div className="text-text-meta mb-6 text-xs">
        <Link to="/">Início</Link> / <Link to="/tecidos">Tecidos</Link> / {product.name}
      </div>

      <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
        <div>
          <ImagePlaceholder
            colors={[selectedColor.hex, product.colors[1]]}
            src={product.images[selectedImageIdx]?.url}
            alt={product.name}
            className="mb-3.5 h-[420px] rounded-sm md:h-[480px]"
            zoomOnHover
          />
          {product.images.length > 1 && (
            <div className="mb-3.5 flex gap-2.5">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Ver imagem ${index + 1}`}
                  onClick={() => setSelectedImageIdx(index)}
                  className={cn(
                    'size-16 shrink-0 overflow-hidden rounded-sm',
                    index === selectedImageIdx ? 'ring-navy ring-2 ring-offset-2' : 'ring-input ring-1',
                  )}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {product.colorOptions.map((option, index) => (
              <button
                key={option.id}
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
          <div className="text-brand-red mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {formatCompositionLabel(product.compositions, compositions)}
          </div>
          <h1 className="text-navy-dark mb-3 font-serif text-3xl font-medium">{product.name}</h1>
          <div className="mb-2 flex items-center gap-3 text-2xl font-medium">
            {formatPriceBRL(product.pricePerMeter)}{' '}
            <span className="text-text-meta text-sm font-normal">/ metro</span>
            {averageRating !== null && (
              <span className="text-text-meta flex items-center gap-1 text-sm font-normal">
                <Star className="size-3.5 fill-current text-[#d4a03c]" />
                {averageRating.toFixed(1)} ({reviews.length})
              </span>
            )}
          </div>
          {outOfStock ? (
            <div className="bg-foreground mb-5 inline-block rounded-sm px-2.5 py-1 text-xs tracking-[0.05em] text-white uppercase">
              Esgotado
            </div>
          ) : product.status === 'low_stock' ? (
            <div className="bg-navy mb-5 inline-block rounded-sm px-2.5 py-1 text-xs tracking-[0.05em] text-white uppercase">
              Últimas unidades
            </div>
          ) : null}
          <p className="text-text-body mb-6 text-sm leading-relaxed">{product.description}</p>

          <div className="mb-5">
            <div className="text-navy-dark mb-2.5 text-xs font-semibold">
              Cor: {selectedColor.label}
            </div>
            <div className="flex gap-2.5">
              {product.colorOptions.map((option, index) => (
                <button
                  key={option.id}
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
            <div className="text-navy-dark mb-2.5 text-xs font-semibold">Quantidade (metros)</div>
            <div className="border-input flex w-fit items-center rounded-sm border">
              <button
                type="button"
                aria-label="Diminuir metragem"
                onClick={() => setMeters((value) => Math.max(product.minSaleMeters, value - 1))}
                className="flex h-11 w-10 items-center justify-center"
              >
                <Minus className="size-4" />
              </button>
              <div className="w-14 text-center text-base">{meters}m</div>
              <button
                type="button"
                aria-label="Aumentar metragem"
                onClick={() => setMeters((value) => Math.min(product.stockMeters, value + 1))}
                className="flex h-11 w-10 items-center justify-center"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="mb-7 flex gap-3.5">
            <Button
              onClick={handleAddToCart}
              disabled={outOfStock}
              size="lg"
              className="h-auto flex-1 rounded-sm px-6 py-4 text-sm"
            >
              {outOfStock ? 'Produto esgotado' : `Adicionar à sacola — ${formatPriceBRL(subtotal)}`}
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
            <TabsList className="w-full max-w-full justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="composicao">Composição</TabsTrigger>
              <TabsTrigger value="entrega">Entrega</TabsTrigger>
              <TabsTrigger value="cuidados">Cuidados</TabsTrigger>
              <TabsTrigger value="avaliacoes">Avaliações ({reviews.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="composicao" className="text-text-body text-sm leading-relaxed">
              {formatCompositionBreakdown(product.compositions, compositions)} · Largura{' '}
              {formatWidthM(product.widthM)}
              <div className="text-text-meta mt-2 text-xs">SKU: {product.sku}</div>
            </TabsContent>
            <TabsContent value="entrega" className="text-text-body text-sm leading-relaxed">
              {PRODUCT_DELIVERY_DEFAULT}
            </TabsContent>
            <TabsContent value="cuidados" className="text-text-body text-sm leading-relaxed">
              {PRODUCT_CARE_DEFAULT}
            </TabsContent>
            <TabsContent value="avaliacoes" className="flex flex-col gap-4">
              {reviews.length === 0 ? (
                <p className="text-text-body text-sm leading-relaxed">
                  Este produto ainda não tem avaliações.
                </p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-border border-b pb-4 last:border-b-0">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              'size-3.5',
                              index < review.rating ? 'fill-current text-[#d4a03c]' : 'text-input',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-navy-dark text-sm font-semibold">{review.authorName}</span>
                    </div>
                    <p className="text-text-body text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
