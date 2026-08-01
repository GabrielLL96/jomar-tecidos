import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'

const FAVORITES_STORAGE_KEY = 'jomar:favorites'

interface FavoritesContextValue {
  favoriteIds: number[]
  isFavorite: (productId: number) => boolean
  toggleFavorite: (productId: number) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [favoriteIds, setFavoriteIds] = useState<number[]>(
    () => getItem<number[]>(FAVORITES_STORAGE_KEY, []) ?? [],
  )

  const toggleFavorite = (productId: number) => {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId]

    setFavoriteIds(next)
    setItem(FAVORITES_STORAGE_KEY, next)
  }

  const isFavorite = (productId: number) => favoriteIds.includes(productId)

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites deve ser usado dentro de um FavoritesProvider')
  return context
}
