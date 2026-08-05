import { useAuth } from '@/features/auth/AuthContext'
import { useFavorites } from '@/features/favorites/FavoritesContext'
import { useAddresses } from '@/features/account/AddressesContext'
import { useOrders } from '@/features/orders/OrdersContext'

export function AccountSummaryPage() {
  const { user } = useAuth()
  const { favoriteIds } = useFavorites()
  const { addresses } = useAddresses()
  const { orders } = useOrders()

  if (!user) return null

  return (
    <div>
      <div className="border-border mb-5 rounded-md border bg-white p-7">
        <div className="text-navy-dark text-base font-semibold">Olá, {user.name}</div>
        <div className="text-text-meta mt-1 text-sm">{user.email}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-cream-secondary rounded-md p-5">
          <div className="text-text-meta text-xs">Pedidos realizados</div>
          <div className="text-navy mt-1.5 font-serif text-2xl font-medium">{orders.length}</div>
        </div>
        <div className="bg-cream-secondary rounded-md p-5">
          <div className="text-text-meta text-xs">Favoritos</div>
          <div className="text-navy mt-1.5 font-serif text-2xl font-medium">{favoriteIds.length}</div>
        </div>
        <div className="bg-cream-secondary rounded-md p-5">
          <div className="text-text-meta text-xs">Endereços salvos</div>
          <div className="text-navy mt-1.5 font-serif text-2xl font-medium">{addresses.length}</div>
        </div>
      </div>
    </div>
  )
}
