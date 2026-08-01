import { Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { Home } from '@/pages/Home'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { ProductDetailPage } from '@/pages/products/ProductDetailPage'
import { CartPage } from '@/pages/cart/CartPage'
import { CheckoutPage } from '@/pages/checkout/CheckoutPage'
import { ConfirmationPage } from '@/pages/checkout/ConfirmationPage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/contact/ContactPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AccountPage } from '@/pages/auth/AccountPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tecidos" element={<ProductsPage />} />
        <Route path="/tecidos/:slug" element={<ProductDetailPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pedido/:id" element={<ConfirmationPage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/conta/entrar" element={<LoginPage />} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
