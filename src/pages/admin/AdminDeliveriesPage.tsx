import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateBR } from '@/lib/format'
import { useAdminDeliveriesPage } from '@/features/orders/hooks'
import { ADMIN_DELIVERIES_PAGE_SIZE } from '@/features/orders/queries'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AdminDeliveriesPage() {
  const [page, setPage] = useState(0)
  // status exibido vem de order.status (mantido de verdade em todo o fluxo:
  // checkout/avançar status/cancelar), não de delivery.status — essa coluna
  // nasce em 'awaiting_pickup' e nenhum fluxo do app jamais escreve nela.
  // Filtro por status já acontece no servidor (adminDeliveriesPageQueryOptions).
  const { data: pageResult, isLoading, isFetching } = useAdminDeliveriesPage(page)
  const deliveries = pageResult?.rows ?? []
  const totalCount = pageResult?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_DELIVERIES_PAGE_SIZE))

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
                  <TableCell>
                    {order.delivery?.etaDate ? formatDateBR(order.delivery.etaDate) : '—'}
                  </TableCell>
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

      {totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-[#5c5648]">
          <span>
            {totalCount} {totalCount === 1 ? 'entrega' : 'entregas'} — página {page + 1} de{' '}
            {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages || isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
