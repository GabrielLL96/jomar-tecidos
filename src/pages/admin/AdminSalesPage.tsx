import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatPriceBRL } from '@/lib/format'
import { useAdminOrders } from '@/features/orders/hooks'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { PAYMENT_METHODS } from '@/pages/checkout/schema'

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
)

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function AdminSalesPage() {
  const { data: orders = [], isLoading } = useAdminOrders()

  const monthOrders = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return orders.filter((order) => new Date(order.createdAt) >= monthStart)
  }, [orders])

  const kpis = useMemo(() => {
    // "refunded" sai do faturamento junto com "cancelled" — dinheiro que
    // voltou pro cliente não é receita real (achado ao adicionar o status
    // novo, não existia antes do reembolso real via Asaas).
    const valid = monthOrders.filter(
      (order) => order.status !== 'cancelled' && order.status !== 'refunded',
    )
    const revenue = valid.reduce((sum, order) => sum + order.total, 0)
    const cancelledCount = monthOrders.filter((order) => order.status === 'cancelled').length
    const cancellationRate = monthOrders.length ? (cancelledCount / monthOrders.length) * 100 : 0

    return [
      { label: 'Faturamento (mês)', value: formatPriceBRL(revenue) },
      { label: 'Pedidos (mês)', value: String(monthOrders.length) },
      { label: 'Taxa de cancelamento', value: `${percentFormatter.format(cancellationRate)}%` },
    ]
  }, [monthOrders])

  return (
    <div>
      <div className="mb-[22px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-[#e4ddd0] bg-white p-5">
            <div className="text-xs text-[#8c8375]">{kpi.label}</div>
            <div className="text-navy-dark mt-1.5 font-serif text-2xl font-semibold">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Carregando…</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <p className="text-text-meta text-sm">Nenhum pedido registrado ainda.</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.orderNumber}</TableCell>
                  <TableCell>{dateTimeFormatter.format(new Date(order.createdAt))}</TableCell>
                  <TableCell>{order.customerName ?? '—'}</TableCell>
                  <TableCell>
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </TableCell>
                  <TableCell>{formatPriceBRL(order.total)}</TableCell>
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
                  <TableCell>
                    <Button variant="outline" size="icon-sm" asChild title="Ver detalhes">
                      <Link to={`/admin/vendas/${order.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
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
