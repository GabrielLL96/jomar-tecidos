import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { formatPriceBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useFavorites } from '@/features/favorites/FavoritesContext'
import { useCompositions } from '../hooks'
import { formatCompositionLabel } from '../utils'
import type { Product } from '../types'

interface ProductCardProps {
  product: Product
  variant?: 'light' | 'dark'
}

export function ProductCard({ product, variant = 'light' }: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { data: compositions = [] } = useCompositions()
  const favorite = isFavorite(product.id)
  const isDark = variant === 'dark'
  const outOfStock = product.status === 'out_of_stock'

  return (
    <div className="group relative">
      <Link to={`/tecidos/${product.slug}`}>
        <ImagePlaceholder
          colors={product.colors}
          src={product.images[0]?.url}
          alt={product.name}
          className={cn('h-[190px] rounded-sm md:h-[210px]', outOfStock && 'opacity-60')}
        >
          {outOfStock ? (
            <span className="bg-foreground absolute top-2.5 left-2.5 rounded-sm px-2 py-1 text-xs tracking-[0.05em] text-white uppercase">
              Esgotado
            </span>
          ) : product.tag ? (
            <span className="bg-brand-red absolute top-2.5 left-2.5 rounded-sm px-2 py-1 text-xs tracking-[0.05em] text-white uppercase">
              {product.tag}
            </span>
          ) : product.status === 'low_stock' ? (
            <span className="bg-navy absolute top-2.5 left-2.5 rounded-sm px-2 py-1 text-xs tracking-[0.05em] text-white uppercase">
              Últimas unidades
            </span>
          ) : null}
        </ImagePlaceholder>
        <div className={cn('mt-3 text-sm font-medium', isDark ? 'text-white' : 'text-foreground')}>
          {product.name}
        </div>
        <div className={cn('mt-0.5 text-xs', isDark ? 'text-[#b6b0d8]' : 'text-text-meta')}>
          {formatCompositionLabel(product.compositions, compositions)}
        </div>
        <div className={cn('mt-1.5 text-sm font-medium', isDark ? 'text-[#e8c9a3]' : 'text-navy')}>
          {formatPriceBRL(product.pricePerMeter)} / m
        </div>
      </Link>
      <button
        type="button"
        aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onClick={() => toggleFavorite(product.id)}
        className={cn(
          'absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-white/90',
          favorite ? 'text-brand-red' : 'text-foreground',
        )}
      >
        <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
