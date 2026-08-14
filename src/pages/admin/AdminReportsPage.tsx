import { useMemo } from 'react'
import { buildCSV, downloadCSV } from '@/lib/csv'
import { formatDateBR, formatPriceBRL, toDateOnly } from '@/lib/format'
import { useAdminCoupons, useAdminOrders } from '@/features/orders/hooks'
import { useAdminProducts, useCompositions } from '@/features/catalog/hooks'
import { useAdminUsers } from '@/features/users/hooks'
import { buildStockCSV } from '@/features/catalog/utils'
import { computeCouponStatus, couponValueLabel } from '@/features/orders/coupon-utils'
import {
  COUPON_STATUS_LABELS,
  COUPON_TYPE_LABELS,
  ORDER_STATUS_LABELS,
} from '@/features/orders/data'
import { PAYMENT_METHODS } from '@/pages/checkout/schema'

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
)

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

// fim do dia local da previsão, pra comparar contra um timestamp real —
// nunca `new Date(dateOnly)` direto (vira UTC meia-noite, desloca a data em
// fuso negativo, ver _Feedback.md do projeto).
function endOfDayLocal(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59)
}

export function AdminReportsPage() {
  const { data: orders = [] } = useAdminOrders()
  const { data: products = [] } = useAdminProducts()
  const { data: compositions = [] } = useCompositions()
  const { data: coupons = [] } = useAdminCoupons()
  const { data: users = [] } = useAdminUsers()

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const exportSales = () => {
    const csv = buildCSV(
      ['Pedido', 'Data', 'Cliente', 'Pagamento', 'Subtotal', 'Frete', 'Desconto', 'Total', 'Status'],
      orders.map((order) => [
        `#${order.orderNumber}`,
        dateTimeFormatter.format(new Date(order.createdAt)),
        order.customerName ?? '',
        PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod,
        formatPriceBRL(order.subtotal),
        formatPriceBRL(order.shippingCost),
        formatPriceBRL(order.discountTotal),
        formatPriceBRL(order.total),
        ORDER_STATUS_LABELS[order.status],
      ]),
    )
    downloadCSV(csv, `vendas-${toDateOnly(new Date())}.csv`)
  }

  const exportCompositionPerformance = () => {
    // pedido cancelado ou reembolsado não conta como venda real — mesmo
    // critério já usado no KPI "Faturamento" de /admin/vendas.
    const valid = orders.filter((order) => order.status !== 'cancelled' && order.status !== 'refunded')

    const byComposition = new Map<string, { orders: number; meters: number; revenue: number }>()
    for (const order of valid) {
      for (const item of order.items) {
        const product = productsById.get(item.productId)
        if (!product || product.compositions.length === 0) continue
        for (const { compositionId, percentage } of product.compositions) {
          const share = percentage / 100
          const entry = byComposition.get(compositionId) ?? { orders: 0, meters: 0, revenue: 0 }
          entry.orders += 1
          entry.meters += item.meters * share
          entry.revenue += item.total * share
          byComposition.set(compositionId, entry)
        }
      }
    }

    const rows = [...byComposition.entries()]
      .map(([compositionId, stats]) => ({
        name: compositions.find((c) => c.id === compositionId)?.name ?? compositionId,
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const csv = buildCSV(
      ['Composição', 'Itens vendidos', 'Metros vendidos', 'Faturamento'],
      rows.map((row) => [
        row.name,
        String(row.orders),
        row.meters.toFixed(2).replace('.', ','),
        formatPriceBRL(row.revenue),
      ]),
    )
    downloadCSV(csv, `desempenho-composicao-${toDateOnly(new Date())}.csv`)
  }

  const exportStock = () => {
    downloadCSV(buildStockCSV(products, compositions), `estoque-reposicao-${toDateOnly(new Date())}.csv`)
  }

  const exportCoupons = () => {
    const csv = buildCSV(
      ['Código', 'Tipo', 'Valor', 'Usos', 'Limite', 'Status'],
      coupons.map((coupon) => [
        coupon.code,
        COUPON_TYPE_LABELS[coupon.type],
        couponValueLabel(coupon.type, coupon.value),
        String(coupon.usedCount),
        coupon.maxUses !== undefined ? String(coupon.maxUses) : 'Sem limite',
        COUPON_STATUS_LABELS[computeCouponStatus(coupon)],
      ]),
    )
    downloadCSV(csv, `cupons-utilizados-${toDateOnly(new Date())}.csv`)
  }

  const exportCustomers = () => {
    const byEmail = new Map<string, { count: number; total: number }>()
    for (const order of orders) {
      if (!order.customerEmail || order.status === 'cancelled' || order.status === 'refunded') continue
      const entry = byEmail.get(order.customerEmail) ?? { count: 0, total: 0 }
      entry.count += 1
      entry.total += order.total
      byEmail.set(order.customerEmail, entry)
    }

    const customers = users.filter((user) => user.role === 'customer')
    const csv = buildCSV(
      ['Cliente', 'E-mail', 'Cadastro em', 'Pedidos', 'Total gasto'],
      customers.map((customer) => {
        const stats = byEmail.get(customer.email) ?? { count: 0, total: 0 }
        return [
          customer.name,
          customer.email,
          dateFormatter.format(new Date(customer.createdAt)),
          String(stats.count),
          formatPriceBRL(stats.total),
        ]
      }),
    )
    downloadCSV(csv, `clientes-${toDateOnly(new Date())}.csv`)
  }

  const exportDeliverySLA = () => {
    // status/tempo vêm de order_status_history (timestamp real gravado a cada
    // avanço de status, ADR-012) — não de deliveries.status, que nenhum fluxo
    // do app escreve (ver /admin/entregas). Só pedidos com o marco "delivered"
    // no histórico entram — sem isso não dá pra medir tempo de entrega real.
    const rows = orders
      .filter((order) => order.status === 'delivered')
      .flatMap((order) => {
        const deliveredEntry = order.statusHistory.find((entry) => entry.status === 'delivered')
        if (!deliveredEntry) return []
        const createdAt = new Date(order.createdAt)
        const deliveredAt = new Date(deliveredEntry.createdAt)
        const days = (deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        const etaDate = order.delivery?.etaDate
        const delayed = etaDate ? deliveredAt > endOfDayLocal(etaDate) : false
        return [{ order, createdAt, deliveredAt, etaDate, days, delayed }]
      })

    const csv = buildCSV(
      ['Pedido', 'Cliente', 'Criado em', 'Entregue em', 'Previsão', 'Dias até entrega', 'Atrasado'],
      rows.map((row) => [
        `#${row.order.orderNumber}`,
        row.order.customerName ?? '',
        dateTimeFormatter.format(row.createdAt),
        dateTimeFormatter.format(row.deliveredAt),
        row.etaDate ? formatDateBR(row.etaDate) : 'Sem previsão registrada',
        row.days.toFixed(1).replace('.', ','),
        row.etaDate ? (row.delayed ? 'Sim' : 'Não') : 'Sem previsão pra comparar',
      ]),
    )
    downloadCSV(csv, `entregas-sla-${toDateOnly(new Date())}.csv`)
  }

  const reports = [
    {
      name: 'Vendas por período',
      desc: 'Faturamento, pagamento e status de cada pedido registrado.',
      onExport: exportSales,
    },
    {
      name: 'Desempenho por composição',
      desc: 'Comparativo de vendas entre linhos, algodões, sedas etc.',
      onExport: exportCompositionPerformance,
    },
    {
      name: 'Estoque e reposição',
      desc: 'Itens com estoque baixo e status de reposição.',
      onExport: exportStock,
    },
    {
      name: 'Cupons utilizados',
      desc: 'Uso de cupons e limite restante de cada código.',
      onExport: exportCoupons,
    },
    {
      name: 'Clientes',
      desc: 'Cadastro, volume de pedidos e total gasto por cliente.',
      onExport: exportCustomers,
    },
    {
      name: 'Entregas e SLA',
      desc: 'Tempo até a entrega e atrasos frente à previsão, por pedido entregue.',
      onExport: exportDeliverySLA,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <div key={report.name} className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-navy-dark text-sm font-semibold">{report.name}</div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-[#8c8375]">{report.desc}</div>
          <button
            type="button"
            onClick={report.onExport}
            className="text-navy mt-4 inline-block cursor-pointer border-b border-[#1c1a5e] text-[12.5px] font-semibold"
          >
            Exportar CSV
          </button>
        </div>
      ))}
    </div>
  )
}
