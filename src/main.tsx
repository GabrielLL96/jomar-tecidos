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
import { ConsentProvider } from '@/features/consent/ConsentContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { initErrorReporting } from '@/lib/error-reporting'
import App from './App.tsx'
import './index.css'

initErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FavoritesProvider>
            <AddressesProvider>
              <CartProvider>
                <ConsentProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                  <Toaster richColors position="top-right" />
                </ConsentProvider>
              </CartProvider>
            </AddressesProvider>
          </FavoritesProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
