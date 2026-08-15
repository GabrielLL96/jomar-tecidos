import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'

const FAVORITES_STORAGE_KEY = 'jomar:favorites'

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [favoriteIds, setFavoriteIds] = useState<string[]>(
    () => getItem<string[]>(FAVORITES_STORAGE_KEY, []) ?? [],
  )

  const toggleFavorite = (productId: string) => {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId]

    setFavoriteIds(next)
    setItem(FAVORITES_STORAGE_KEY, next)
  }

  const isFavorite = (productId: string) => favoriteIds.includes(productId)

  const clearFavorites = () => {
    setFavoriteIds([])
    setItem(FAVORITES_STORAGE_KEY, [])
  }

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, clearFavorites }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites deve ser usado dentro de um FavoritesProvider')
  return context
}
