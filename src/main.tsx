import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/AuthContext'
import { FavoritesProvider } from '@/features/favorites/FavoritesContext'
import { CartProvider } from '@/features/cart/CartContext'
import { AddressesProvider } from '@/features/account/AddressesContext'
import { OrdersProvider } from '@/features/orders/OrdersContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <AddressesProvider>
            <OrdersProvider>
              <CartProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
                <Toaster richColors position="top-right" />
              </CartProvider>
            </OrdersProvider>
          </AddressesProvider>
        </FavoritesProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  </StrictMode>,
)
