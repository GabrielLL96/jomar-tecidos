import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPriceBRL } from '@/lib/format'
import { MOCK_ORDERS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { PRODUCTS } from '@/features/catalog/data'

const SALES_BARS = [40, 55, 48, 62, 58, 70, 65, 80, 72, 90, 84, 95, 88, 100]
const TOP_COMPOSITIONS = [
  { name: 'Linhos', pct: 34 },
  { name: 'Algodões', pct: 28 },
  { name: 'Aviamentos', pct: 22 },
  { name: 'Sedas', pct: 16 },
]

function computeKpis() {
  const revenue = MOCK_ORDERS.reduce((total, order) => total + order.total, 0)
  const orderCount = MOCK_ORDERS.length
  const avgTicket = orderCount ? revenue / orderCount : 0
  const criticalStock = PRODUCTS.filter(
    (product) => product.status === 'low_stock' || product.status === 'out_of_stock',
  ).length

  return [
    { label: 'Faturamento (pedidos mock)', value: formatPriceBRL(revenue) },
    { label: 'Pedidos', value: String(orderCount) },
    { label: 'Ticket médio', value: formatPriceBRL(avgTicket) },
    { label: 'Estoque crítico', value: `${criticalStock} ${criticalStock === 1 ? 'item' : 'itens'}` },
  ]
}

const recentOrders = [...MOCK_ORDERS]
  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  .slice(0, 5)

export function AdminDashboardPage() {
  const kpis = computeKpis()

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
          <div className="text-navy-dark mb-4 text-sm font-semibold">Vendas nos últimos 14 dias</div>
          <div className="flex h-40 items-end gap-2">
            {SALES_BARS.map((height, index) => (
              <div
                key={index}
                className="bg-navy flex-1 rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-navy-dark mb-4 text-sm font-semibold">Composições mais vendidas</div>
          {TOP_COMPOSITIONS.map((c) => (
            <div key={c.name} className="mb-3.5">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span>{c.name}</span>
                <span className="text-[#8c8375]">{c.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#ede8de]">
                <div className="bg-brand-red h-full rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
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
            {recentOrders.map((order) => (
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
