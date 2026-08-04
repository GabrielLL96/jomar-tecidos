import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'
import type { CartItem } from './types'

const CART_STORAGE_KEY = 'jomar:cart'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: Omit<CartItem, 'id'>) => void
  updateMeters: (id: string, meters: number) => void
  removeItem: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [items, setItems] = useState<CartItem[]>(() => getItem<CartItem[]>(CART_STORAGE_KEY, []) ?? [])

  const persist = (next: CartItem[]) => {
    setItems(next)
    setItem(CART_STORAGE_KEY, next)
  }

  const addItem: CartContextValue['addItem'] = (item) => {
    const id = `${item.productId}:${item.colorId}`
    const existing = items.find((cartItem) => cartItem.id === id)

    if (existing) {
      persist(
        items.map((cartItem) =>
          cartItem.id === id ? { ...cartItem, meters: cartItem.meters + item.meters } : cartItem,
        ),
      )
      return
    }

    persist([...items, { ...item, id }])
  }

  const updateMeters: CartContextValue['updateMeters'] = (id, meters) => {
    if (meters < 1) return
    persist(items.map((cartItem) => (cartItem.id === id ? { ...cartItem, meters } : cartItem)))
  }

  const removeItem: CartContextValue['removeItem'] = (id) => {
    persist(items.filter((cartItem) => cartItem.id !== id))
  }

  const clear = () => persist([])

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: items.reduce((total, item) => total + item.meters, 0),
      subtotal: items.reduce((total, item) => total + item.meters * item.pricePerMeter, 0),
    }),
    [items],
  )

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, updateMeters, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider')
  return context
}
