import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPriceBRL } from '@/lib/format'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { useAdminOrders } from '@/features/orders/hooks'
import { useCompositions, useProducts } from '@/features/catalog/hooks'
import type { Composition, Product } from '@/features/catalog/types'
import type { Order } from '@/features/orders/types'

const DAYS_WINDOW = 14

function computeKpis(products: Product[], orders: Order[]) {
  const revenue = orders.reduce((total, order) => total + order.total, 0)
  const orderCount = orders.length
  const avgTicket = orderCount ? revenue / orderCount : 0
  const criticalStock = products.filter(
    (product) => product.status === 'low_stock' || product.status === 'out_of_stock',
  ).length

  return [
    { label: 'Faturamento (total)', value: formatPriceBRL(revenue) },
    { label: 'Pedidos', value: String(orderCount) },
    { label: 'Ticket médio', value: formatPriceBRL(avgTicket) },
    { label: 'Estoque crítico', value: `${criticalStock} ${criticalStock === 1 ? 'item' : 'itens'}` },
  ]
}

// Mesmo critério já usado em /admin/vendas e /admin/relatorios: pedido
// cancelado não conta como venda real.
function computeSalesBars(orders: Order[]) {
  const valid = orders.filter((order) => order.status !== 'cancelled')
  const revenueByDay = new Map<string, number>()
  const today = new Date()
  const days: { key: string; label: string }[] = []
  for (let i = DAYS_WINDOW - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    // componentes locais, não toISOString — evita o deslocamento de data já
    // documentado em fuso negativo (ver skills/reactjs.md deste vault).
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    days.push({ key, label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) })
    revenueByDay.set(key, 0)
  }

  for (const order of valid) {
    const orderDate = new Date(order.createdAt)
    const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`
    if (revenueByDay.has(key)) revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.total)
  }

  const values = days.map((day) => revenueByDay.get(day.key) ?? 0)
  const max = Math.max(...values)

  return days.map((day, index) => ({
    label: day.label,
    revenue: values[index],
    height: max > 0 ? (values[index] / max) * 100 : 0,
  }))
}

// Desconto de composição multi-fibra: cada item de pedido contribui pro
// faturamento de cada composição na proporção do seu percentual no produto
// (mesmo cálculo já usado em exportCompositionPerformance, /admin/relatorios).
function computeTopCompositions(products: Product[], orders: Order[], compositions: Composition[]) {
  const valid = orders.filter((order) => order.status !== 'cancelled')
  const productsById = new Map(products.map((product) => [product.id, product]))
  const revenueByComposition = new Map<string, number>()

  for (const order of valid) {
    for (const item of order.items) {
      const product = productsById.get(item.productId)
      if (!product) continue
      for (const { compositionId, percentage } of product.compositions) {
        const share = item.total * (percentage / 100)
        revenueByComposition.set(compositionId, (revenueByComposition.get(compositionId) ?? 0) + share)
      }
    }
  }

  const total = [...revenueByComposition.values()].reduce((sum, value) => sum + value, 0)

  return [...revenueByComposition.entries()]
    .map(([compositionId, revenue]) => ({
      name: compositions.find((c) => c.id === compositionId)?.name ?? compositionId,
      pct: total > 0 ? (revenue / total) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)
}

export function AdminDashboardPage() {
  const { data: products = [] } = useProducts()
  const { data: orders = [] } = useAdminOrders()
  const { data: compositions = [] } = useCompositions()

  const kpis = computeKpis(products, orders)
  const salesBars = computeSalesBars(orders)
  const topCompositions = computeTopCompositions(products, orders, compositions)
  const recentOrders = orders.slice(0, 5)

  return (
    <div>
      <div className="mb-7 grid grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
            <div className="text-xs text-[#8c8375]">{kpi.label}</div>
            <div className="text-navy-dark mt-1.5 font-serif text-[28px] font-semibold">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-7 grid grid-cols-[1.4fr_1fr] gap-5">
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-navy-dark mb-4 text-sm font-semibold">
            Vendas nos últimos {DAYS_WINDOW} dias
          </div>
          <div className="flex h-40 items-end gap-2">
            {salesBars.map((bar) => (
              <div
                key={bar.label}
                className="bg-navy min-h-[2px] flex-1 rounded-t-sm"
                style={{ height: `${bar.height}%` }}
                title={`${bar.label}: ${formatPriceBRL(bar.revenue)}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-navy-dark mb-4 text-sm font-semibold">Composições mais vendidas</div>
          {topCompositions.length === 0 ? (
            <p className="text-text-meta text-sm">Sem vendas registradas ainda.</p>
          ) : (
            topCompositions.map((c) => (
              <div key={c.name} className="mb-3.5">
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span>{c.name}</span>
                  <span className="text-[#8c8375]">{c.pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#ede8de]">
                  <div className="bg-brand-red h-full rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
        <div className="text-navy-dark mb-3.5 text-sm font-semibold">Pedidos recentes</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center">
                  <p className="text-text-meta text-sm">Nenhum pedido registrado ainda.</p>
                </TableCell>
              </TableRow>
            ) : (
              recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.orderNumber}</TableCell>
                  <TableCell>{order.items.length}</TableCell>
                  <TableCell>{formatPriceBRL(order.total)}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
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
