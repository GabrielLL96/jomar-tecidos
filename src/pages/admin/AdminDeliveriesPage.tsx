import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatDateBR } from '@/lib/format'
import { useAdminOrders } from '@/features/orders/hooks'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AdminDeliveriesPage() {
  const { data: orders = [], isLoading } = useAdminOrders()

  // status exibido vem de order.status (mantido de verdade em todo o fluxo:
  // checkout/avançar status/cancelar), não de delivery.status — essa coluna
  // nasce em 'awaiting_pickup' e nenhum fluxo do app jamais escreve nela.
  const deliveries = useMemo(
    () => orders.filter((order) => order.status === 'paid' || order.status === 'shipping' || order.status === 'delivered'),
    [orders],
  )

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-text-meta text-sm">Nenhuma entrega em andamento.</p>
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName ?? '—'}</TableCell>
                  <TableCell>{order.delivery?.carrier ?? '—'}</TableCell>
                  <TableCell>
                    {order.delivery?.trackingUrl && order.delivery.trackingCode ? (
                      <a
                        href={order.delivery.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-navy hover:underline"
                      >
                        {order.delivery.trackingCode}
                      </a>
                    ) : (
                      (order.delivery?.trackingCode ?? '—')
                    )}
                  </TableCell>
                  <TableCell>{order.delivery?.etaDate ? formatDateBR(order.delivery.etaDate) : '—'}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        ORDER_STATUS_STYLES[order.status],
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
