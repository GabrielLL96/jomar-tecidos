import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/features/catalog/hooks'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { useFavorites } from '@/features/favorites/FavoritesContext'

export function FavoritesPage() {
  const { data: products } = useProducts()
  const { favoriteIds } = useFavorites()
  const favorites = products?.filter((product) => favoriteIds.includes(product.id)) ?? []

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-10 md:px-12">
      <h1 className="text-navy-dark mb-8 font-serif text-[32px] font-medium">Meus favoritos</h1>

      {favorites.length === 0 ? (
        <div className="text-center">
          <p className="text-text-body mb-5 text-sm">Você ainda não favoritou nenhum tecido.</p>
          <Link to="/tecidos">
            <Button size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
              Ver coleção
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}
