import { useParams } from 'react-router-dom'
import { OrderDetail } from '@/features/orders/OrderDetail'

// Aninhada em AccountLayout (/conta/pedidos/:id) — sem <main> próprio (o
// AccountLayout já provê) e sem link de volta (o sidebar já mostra "Meus
// Pedidos" ativo). Ver OrderDetail.tsx pro conteúdo compartilhado com a rota
// standalone pós-checkout (/pedido/:id, ConfirmationPage.tsx).
export function AccountOrderDetailPage() {
  const { id } = useParams()
  return <OrderDetail id={id} />
}
