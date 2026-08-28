import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { RouteFallback } from '@/components/common/RouteFallback'
import { RootLayout } from '@/components/layout/RootLayout'
import { Home } from '@/pages/Home'

const ProductsPage = lazy(() =>
  import('@/pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const ProductDetailPage = lazy(() =>
  import('@/pages/products/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
)
const CartPage = lazy(() => import('@/pages/cart/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() =>
  import('@/pages/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const ConfirmationPage = lazy(() =>
  import('@/pages/checkout/ConfirmationPage').then((m) => ({ default: m.ConfirmationPage })),
)
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const PrivacyPolicyPage = lazy(() =>
  import('@/pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
)
const ContactPage = lazy(() =>
  import('@/pages/contact/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const FavoritesPage = lazy(() =>
  import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const AccountLayout = lazy(() =>
  import('@/pages/auth/AccountLayout').then((m) => ({ default: m.AccountLayout })),
)
const AccountSummaryPage = lazy(() =>
  import('@/pages/auth/AccountSummaryPage').then((m) => ({ default: m.AccountSummaryPage })),
)
const AccountOrdersPage = lazy(() =>
  import('@/pages/auth/AccountOrdersPage').then((m) => ({ default: m.AccountOrdersPage })),
)
const AccountAddressesPage = lazy(() =>
  import('@/pages/auth/AccountAddressesPage').then((m) => ({ default: m.AccountAddressesPage })),
)
const AccountDataPage = lazy(() =>
  import('@/pages/auth/AccountDataPage').then((m) => ({ default: m.AccountDataPage })),
)
const AdminLayout = lazy(() =>
  import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
)
const AdminCompositionsPage = lazy(() =>
  import('@/pages/admin/AdminCompositionsPage').then((m) => ({
    default: m.AdminCompositionsPage,
  })),
)
const AdminStockPage = lazy(() =>
  import('@/pages/admin/AdminStockPage').then((m) => ({ default: m.AdminStockPage })),
)
const AdminSalesPage = lazy(() =>
  import('@/pages/admin/AdminSalesPage').then((m) => ({ default: m.AdminSalesPage })),
)
const AdminSalesOrderDetailPage = lazy(() =>
  import('@/pages/admin/AdminSalesOrderDetailPage').then((m) => ({
    default: m.AdminSalesOrderDetailPage,
  })),
)
const AdminDeliveriesPage = lazy(() =>
  import('@/pages/admin/AdminDeliveriesPage').then((m) => ({ default: m.AdminDeliveriesPage })),
)
const AdminReportsPage = lazy(() =>
  import('@/pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
)
const AdminCouponsPage = lazy(() =>
  import('@/pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage })),
)
const AdminMelhorEnvioCallbackPage = lazy(() =>
  import('@/pages/admin/AdminMelhorEnvioCallbackPage').then((m) => ({
    default: m.AdminMelhorEnvioCallbackPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminUserDetailPage = lazy(() =>
  import('@/pages/admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })),
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
)
const AdminLogsPage = lazy(() =>
  import('@/pages/admin/AdminLogsPage').then((m) => ({ default: m.AdminLogsPage })),
)
const AdminIntegrationLogPage = lazy(() =>
  import('@/pages/admin/AdminIntegrationLogPage').then((m) => ({
    default: m.AdminIntegrationLogPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/tecidos" element={<ProductsPage />} />
            <Route path="/tecidos/:slug" element={<ProductDetailPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido/:id" element={<ConfirmationPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/favoritos" element={<FavoritesPage />} />
            <Route path="/conta/entrar" element={<LoginPage />} />
            <Route path="/conta/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/conta/redefinir-senha" element={<ResetPasswordPage />} />
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
            <Route path="cupons" element={<AdminCouponsPage />} />
            <Route path="usuarios" element={<AdminUsersPage />} />
            <Route path="usuarios/:id" element={<AdminUserDetailPage />} />
            <Route path="relatorios" element={<AdminReportsPage />} />
            <Route path="configuracoes" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="integracoes-log" element={<AdminIntegrationLogPage />} />
            <Route path="melhor-envio/callback" element={<AdminMelhorEnvioCallbackPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
