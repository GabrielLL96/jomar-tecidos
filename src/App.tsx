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
import { AccountLayout } from '@/pages/auth/AccountLayout'
import { AccountSummaryPage } from '@/pages/auth/AccountSummaryPage'
import { AccountOrdersPage } from '@/pages/auth/AccountOrdersPage'
import { AccountAddressesPage } from '@/pages/auth/AccountAddressesPage'
import { AccountDataPage } from '@/pages/auth/AccountDataPage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminCompositionsPage } from '@/pages/admin/AdminCompositionsPage'
import { AdminStockPage } from '@/pages/admin/AdminStockPage'
import { AdminSalesPage } from '@/pages/admin/AdminSalesPage'
import { AdminSalesOrderDetailPage } from '@/pages/admin/AdminSalesOrderDetailPage'
import { AdminDeliveriesPage } from '@/pages/admin/AdminDeliveriesPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { AdminMelhorEnvioCallbackPage } from '@/pages/admin/AdminMelhorEnvioCallbackPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
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
        <Route path="/conta" element={<AccountLayout />}>
          <Route index element={<AccountSummaryPage />} />
          <Route path="pedidos" element={<AccountOrdersPage />} />
          <Route path="enderecos" element={<AccountAddressesPage />} />
          <Route path="dados" element={<AccountDataPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="produtos" element={<AdminProductsPage />} />
        <Route path="composicoes" element={<AdminCompositionsPage />} />
        <Route path="estoque" element={<AdminStockPage />} />
        <Route path="vendas" element={<AdminSalesPage />} />
        <Route path="vendas/:id" element={<AdminSalesOrderDetailPage />} />
        <Route path="entregas" element={<AdminDeliveriesPage />} />
        <Route path="usuarios" element={<AdminUsersPage />} />
        <Route path="relatorios" element={<AdminReportsPage />} />
        <Route path="configuracoes" element={<AdminSettingsPage />} />
        <Route path="melhor-envio/callback" element={<AdminMelhorEnvioCallbackPage />} />
      </Route>
    </Routes>
  )
}

export default App
