import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { formatPriceBRL, toDateOnly } from '@/lib/format'
import { computeStockStatus } from '@/features/catalog/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useAdminOrders } from '@/features/orders/hooks'
import { DELIVERY_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { PAYMENT_METHODS } from '@/pages/checkout/schema'
import type { Order, OrderStatus } from '@/features/orders/types'

const ALL_STATUSES = 'all'
const ALL_PAYMENTS = 'all'
type PeriodPreset = 'today' | '7d' | '30d' | 'custom'

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
)

// "cancelled" só é alcançável pelo fluxo dedicado de cancelamento (exige
// motivo + estorna estoque/cupom) — nunca pelo seletor de status genérico.
const STATUS_TRANSITIONS: OrderStatus[] = ['pending', 'paid', 'shipping', 'delivered']

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function toCSV(rows: Order[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = ['Pedido', 'Data', 'Cliente', 'Pagamento', 'Total', 'Status']
  const lines = rows.map((order) =>
    [
      order.orderNumber,
      dateTimeFormatter.format(new Date(order.createdAt)),
      order.customerName ?? '',
      PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod,
      String(order.total),
      ORDER_STATUS_LABELS[order.status],
    ]
      .map(escape)
      .join(','),
  )
  return [header.map(escape).join(','), ...lines].join('\n')
}

function periodRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } | null {
  const now = new Date()
  if (preset === 'today') return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: now }
  if (preset === '7d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    return { from, to: now }
  }
  if (preset === '30d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    return { from, to: now }
  }
  if (!customFrom || !customTo) return null
  const [fy, fm, fd] = customFrom.split('-').map(Number)
  const [ty, tm, td] = customTo.split('-').map(Number)
  return { from: new Date(fy, fm - 1, fd), to: new Date(ty, tm - 1, td, 23, 59, 59, 999) }
}

export function AdminSalesPage() {
  const { user } = useAuth()
  const { data: orders = [], isLoading } = useAdminOrders()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [paymentFilter, setPaymentFilter] = useState(ALL_PAYMENTS)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  const [shippingOrder, setShippingOrder] = useState<Order | null>(null)
  const [carrier, setCarrier] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [isSavingShipping, setIsSavingShipping] = useState(false)

  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)

  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCanceling, setIsCanceling] = useState(false)

  const range = useMemo(
    () => periodRange(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo],
  )

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (range) {
        const createdAt = new Date(order.createdAt)
        if (createdAt < range.from || createdAt > range.to) return false
      }
      if (statusFilter !== ALL_STATUSES && order.status !== statusFilter) return false
      if (paymentFilter !== ALL_PAYMENTS && order.paymentMethod !== paymentFilter) return false
      if (query) {
        const matches =
          order.orderNumber.toLowerCase().includes(query) ||
          (order.customerName ?? '').toLowerCase().includes(query)
        if (!matches) return false
      }
      return true
    })
  }, [orders, range, statusFilter, paymentFilter, search])

  const kpis = useMemo(() => {
    // pedido cancelado não é venda real — não conta pra faturamento/ticket médio.
    const valid = filteredOrders.filter((order) => order.status !== 'cancelled')
    const revenue = valid.reduce((sum, order) => sum + order.total, 0)
    const count = valid.length
    return { revenue, count, avgTicket: count ? revenue / count : 0 }
  }, [filteredOrders])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['orders'] })

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (nextStatus === order.status) return
    if (nextStatus === 'shipping' && !order.delivery) {
      setShippingOrder(order)
      setCarrier('')
      setTrackingCode('')
      return
    }

    setStatusSavingId(order.id)
    try {
      const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)
      if (error) throw new Error(error.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: nextStatus,
        changed_by_name: user?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(historyError.message)

      toast.success('Status atualizado')
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o status')
    } finally {
      setStatusSavingId(null)
    }
  }

  const handleSaveShipping = async () => {
    if (!shippingOrder) return
    if (!carrier.trim() || !trackingCode.trim()) {
      toast.error('Informe transportadora e código de rastreio')
      return
    }

    setIsSavingShipping(true)
    try {
      const eta = new Date()
      eta.setDate(eta.getDate() + 5)

      const { error: deliveryError } = await supabase.from('deliveries').insert({
        order_id: shippingOrder.id,
        carrier: carrier.trim(),
        tracking_code: trackingCode.trim(),
        status: 'in_transit',
        eta_date: toDateOnly(eta),
      })
      if (deliveryError) throw new Error(deliveryError.message)

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'shipping' })
        .eq('id', shippingOrder.id)
      if (orderError) throw new Error(orderError.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: shippingOrder.id,
        status: 'shipping',
        changed_by_name: user?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(historyError.message)

      toast.success('Pedido marcado como enviado')
      setShippingOrder(null)
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registrar a entrega')
    } finally {
      setIsSavingShipping(false)
    }
  }

  const openCancel = (order: Order) => {
    setCancelingOrder(order)
    setCancelReason('')
  }

  const handleCancel = async () => {
    if (!cancelingOrder) return
    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento')
      return
    }

    setIsCanceling(true)
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', cancel_reason: cancelReason.trim() })
        .eq('id', cancelingOrder.id)
      if (orderError) throw new Error(orderError.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: cancelingOrder.id,
        status: 'cancelled',
        changed_by_name: user?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(historyError.message)

      // estorno de estoque — mesmo read-then-write client-side já usado no checkout.
      for (const item of cancelingOrder.items) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_meters, min_stock_meters, status')
          .eq('id', item.productId)
          .single()
        if (productError) throw new Error(productError.message)

        const newStock = Number(product.stock_meters) + item.meters
        const newStatus = computeStockStatus(product.status, newStock, Number(product.min_stock_meters))

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_meters: newStock, status: newStatus })
          .eq('id', item.productId)
        if (updateError) throw new Error(updateError.message)

        const { error: movementError } = await supabase.from('stock_movements').insert({
          product_id: item.productId,
          quantity: item.meters,
          reason: `Cancelamento pedido #${cancelingOrder.orderNumber}`,
          user_id: user?.id ?? null,
          performed_by_name: user?.name ?? 'Desconhecido',
        })
        if (movementError) throw new Error(movementError.message)
      }

      if (cancelingOrder.couponId) {
        const { error: couponError } = await supabase.rpc('decrement_coupon_usage', {
          p_coupon_id: cancelingOrder.couponId,
        })
        if (couponError) throw new Error(couponError.message)
      }

      toast.success('Pedido cancelado')
      setCancelingOrder(null)
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar o pedido')
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <div>
      <div className="mb-[18px] grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-xs text-[#8c8375]">Faturamento no período</div>
          <div className="text-navy-dark mt-1.5 font-serif text-[28px] font-semibold">
            {formatPriceBRL(kpis.revenue)}
          </div>
        </div>
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-xs text-[#8c8375]">Pedidos</div>
          <div className="text-navy-dark mt-1.5 font-serif text-[28px] font-semibold">{kpis.count}</div>
        </div>
        <div className="rounded-md border border-[#e4ddd0] bg-white p-[22px]">
          <div className="text-xs text-[#8c8375]">Ticket médio</div>
          <div className="text-navy-dark mt-1.5 font-serif text-[28px] font-semibold">
            {formatPriceBRL(kpis.avgTicket)}
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2.5">
          <Input
            placeholder="Buscar por nº ou cliente…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white sm:w-[220px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full bg-white sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Todos status</SelectItem>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full bg-white sm:w-[170px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PAYMENTS}>Todos pagamentos</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodPreset} onValueChange={(value) => setPeriodPreset(value as PeriodPreset)}>
            <SelectTrigger className="w-full bg-white sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodPreset === 'custom' && (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="w-full bg-white sm:w-[150px]"
              />
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="w-full bg-white sm:w-[150px]"
              />
            </>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCSV(toCSV(filteredOrders), `vendas-${toDateOnly(new Date())}.csv`)}
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
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
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    Nenhum pedido encontrado para os filtros aplicados.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.orderNumber}</TableCell>
                  <TableCell>{dateTimeFormatter.format(new Date(order.createdAt))}</TableCell>
                  <TableCell>{order.customerName ?? '—'}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</TableCell>
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setDetailOrder(order)}>
                        Detalhes
                      </Button>
                      {order.status !== 'cancelled' && (
                        <>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order, value as OrderStatus)}
                            disabled={statusSavingId === order.id}
                          >
                            <SelectTrigger size="sm" className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_TRANSITIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {ORDER_STATUS_LABELS[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="destructive" size="sm" onClick={() => openCancel(order)}>
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido #{detailOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="flex flex-col gap-5 text-sm">
              <div>
                <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">Cliente</div>
                <p>{detailOrder.customerName}</p>
                <p className="text-text-meta text-xs">{detailOrder.customerEmail}</p>
              </div>

              <div>
                <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">Itens</div>
                <div className="flex flex-col gap-1.5">
                  {detailOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.productName}
                        {item.colorLabel ? ` — ${item.colorLabel}` : ''} ({item.meters}m)
                      </span>
                      <span>{formatPriceBRL(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detailOrder.shippingAddress && (
                <div>
                  <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">
                    Endereço de entrega
                  </div>
                  <p>
                    {detailOrder.shippingAddress.street}, {detailOrder.shippingAddress.city} -{' '}
                    {detailOrder.shippingAddress.state} · CEP {detailOrder.shippingAddress.zipCode}
                  </p>
                </div>
              )}

              {detailOrder.delivery && (
                <div>
                  <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">Entrega</div>
                  <p>
                    {detailOrder.delivery.carrier} · {detailOrder.delivery.trackingCode} ·{' '}
                    {DELIVERY_STATUS_LABELS[detailOrder.delivery.status]}
                  </p>
                </div>
              )}

              {detailOrder.couponId && (
                <div>
                  <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">Cupom</div>
                  <p>Desconto de {formatPriceBRL(detailOrder.discountTotal)} aplicado</p>
                </div>
              )}

              {detailOrder.cancelReason && (
                <div>
                  <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">
                    Motivo do cancelamento
                  </div>
                  <p>{detailOrder.cancelReason}</p>
                </div>
              )}

              <div>
                <div className="text-navy-dark mb-1.5 text-xs font-semibold uppercase">
                  Histórico de status
                </div>
                <div className="flex flex-col gap-1">
                  {detailOrder.statusHistory.map((entry) => (
                    <div key={entry.id} className="text-text-meta flex justify-between text-xs">
                      <span>
                        {ORDER_STATUS_LABELS[entry.status]} — {entry.changedByName}
                      </span>
                      <span>{dateTimeFormatter.format(new Date(entry.createdAt))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!shippingOrder} onOpenChange={(open) => !open && setShippingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar pedido #{shippingOrder?.orderNumber} como enviado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="carrier">Transportadora</Label>
              <Input id="carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="trackingCode">Código de rastreio</Label>
              <Input
                id="trackingCode"
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveShipping} disabled={isSavingShipping}>
              {isSavingShipping ? 'Salvando…' : 'Confirmar envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelingOrder} onOpenChange={(open) => !open && setCancelingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido #{cancelingOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancelReason">Motivo do cancelamento</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Ex: solicitação do cliente"
            />
            <p className="text-text-meta text-xs">
              Estoque e cupom (se houver) são estornados automaticamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelingOrder(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCanceling || !cancelReason.trim()}
            >
              {isCanceling ? 'Cancelando…' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
