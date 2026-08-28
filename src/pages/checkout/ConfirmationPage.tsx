import { useParams } from 'react-router-dom'
import { OrderDetail } from '@/features/orders/OrderDetail'
import { useSeoMeta } from '@/lib/seo'

// Rota standalone pós-checkout (/pedido/:id) — usada logo depois de finalizar
// a compra, fora do shell de "Minha conta". A mesma visão também existe
// aninhada em /conta/pedidos/:id (AccountOrderDetailPage), dentro do sidebar
// da conta — ver OrderDetail.tsx pro conteúdo compartilhado entre as duas.
export function ConfirmationPage() {
  const { id } = useParams()

  useSeoMeta({
    title: 'Pedido Confirmado',
    description: 'Confirmação de pedido Jomar Tecidos.',
    path: `/pedido/${id ?? ''}`,
    noindex: true,
  })

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-8">
      <OrderDetail id={id} showBackToOrders />
    </main>
  )
}
