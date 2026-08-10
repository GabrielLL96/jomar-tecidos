import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { formatPriceBRL } from '@/lib/format'
import { computeStockStatus } from '@/features/catalog/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useOrder } from '@/features/orders/hooks'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'
import { PAYMENT_METHODS } from '@/pages/checkout/schema'
import type { OrderStatus } from '@/features/orders/types'

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
)

const APPROVED_PAYMENT_STATUSES: OrderStatus[] = ['paid', 'shipping', 'delivered']

const PROGRESS_STEPS = ['Aguardando', 'Pago', 'Preparando', 'Enviado', 'Entregue']

// "paid" nesse app já significa "em preparação" (não existe status separado
// pra isso) — por isso cobre duas etapas do stepper de uma vez.
function progressStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0
    case 'paid':
      return 2
    case 'shipping':
      return 3
    case 'delivered':
      return 4
    default:
      return -1
  }
}

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação de pagamento.',
  paid: 'Pagamento confirmado — pedido em preparação.',
  shipping: 'Pedido a caminho do cliente.',
  delivered: 'Pedido entregue com sucesso.',
  cancelled: 'Pedido cancelado.',
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'paid', 'shipping', 'delivered']

const ADVANCE_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: 'Marcar como pago',
  paid: 'Marcar como enviado',
  shipping: 'Marcar como entregue',
}

function nextStatus(current: OrderStatus): OrderStatus | null {
  const index = STATUS_FLOW.indexOf(current)
  if (index === -1 || index === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[index + 1]
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function AdminSalesOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: order, isLoading } = useOrder(id)

  const isAdmin = user?.role === 'admin'

  const [trackingCode, setTrackingCode] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [isSavingTracking, setIsSavingTracking] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCanceling, setIsCanceling] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // hidrata os campos de rastreio a partir do pedido carregado — ajuste de
  // state durante o render (guardado por order.id), não useEffect, pra não
  // disparar o setState-em-effect que o React Compiler rejeita aqui.
  const [syncedOrderId, setSyncedOrderId] = useState<string | undefined>(undefined)
  if (order && order.id !== syncedOrderId) {
    setSyncedOrderId(order.id)
    setTrackingCode(order.delivery?.trackingCode ?? '')
    setTrackingUrl(order.delivery?.trackingUrl ?? '')
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['orders'] })

  const handleAdvance = async () => {
    if (!order) return
    const next = nextStatus(order.status)
    if (!next) return

    setIsAdvancing(true)
    try {
      const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
      if (error) throw new Error(error.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: next,
        changed_by_name: user?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(historyError.message)

      toast.success('Status atualizado')
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o status')
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleSaveTracking = async () => {
    if (!order) return
    if (!trackingCode.trim()) {
      toast.error('Informe o código de rastreio')
      return
    }

    setIsSavingTracking(true)
    try {
      if (order.delivery) {
        const { error } = await supabase
          .from('deliveries')
          .update({ tracking_code: trackingCode.trim(), tracking_url: trackingUrl.trim() || null })
          .eq('id', order.delivery.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('deliveries').insert({
          order_id: order.id,
          tracking_code: trackingCode.trim(),
          tracking_url: trackingUrl.trim() || null,
        })
        if (error) throw new Error(error.message)
      }

      toast.success('Rastreio salvo')
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o rastreio')
    } finally {
      setIsSavingTracking(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento')
      return
    }

    setIsCanceling(true)
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', cancel_reason: cancelReason.trim() })
        .eq('id', order.id)
      if (orderError) throw new Error(orderError.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'cancelled',
        changed_by_name: user?.name ?? 'Desconhecido',
      })
      if (historyError) throw new Error(historyError.message)

      // estorno de estoque — mesmo read-then-write client-side já usado no checkout.
      for (const item of order.items) {
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
          reason: `Cancelamento pedido #${order.orderNumber}`,
          user_id: user?.id ?? null,
          performed_by_name: user?.name ?? 'Desconhecido',
        })
        if (movementError) throw new Error(movementError.message)
      }

      if (order.couponId) {
        const { error: couponError } = await supabase.rpc('decrement_coupon_usage', {
          p_coupon_id: order.couponId,
        })
        if (couponError) throw new Error(couponError.message)
      }

      toast.success('Pedido cancelado')
      setCancelOpen(false)
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar o pedido')
    } finally {
      setIsCanceling(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_order', { p_order_id: order.id })
      if (error) throw new Error(error.message)

      toast.success('Pedido excluído')
      await invalidate()
      navigate('/admin/vendas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o pedido')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-text-meta text-sm">Carregando…</p>
  }

  if (!order) {
    return (
      <div>
        <p className="text-text-meta text-sm">Pedido não encontrado.</p>
        <Link to="/admin/vendas" className="text-navy mt-2 inline-block text-sm hover:underline">
          ← Voltar para Vendas
        </Link>
      </div>
    )
  }

  const approvedPayment = APPROVED_PAYMENT_STATUSES.includes(order.status)
  const canAdvance = isAdmin && nextStatus(order.status) !== null && order.status !== 'cancelled'
  const canCancel = order.status !== 'cancelled'
  const canDelete = isAdmin && !approvedPayment

  return (
    <div>
      <Link
        to="/admin/vendas"
        className="text-navy mb-4 inline-flex items-center gap-1.5 rounded-md border border-[#e4ddd0] bg-white px-3 py-2 text-sm hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Voltar para Vendas
      </Link>

      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3 rounded-md border border-[#e4ddd0] bg-white p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-navy-dark font-serif text-xl font-semibold">Pedido #{order.orderNumber}</h1>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                ORDER_STATUS_STYLES[order.status],
              )}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="text-text-meta mt-1 text-xs">
            {dateTimeFormatter.format(new Date(order.createdAt))}
          </div>
        </div>
        <div className="flex gap-2">
          {canAdvance && (
            <Button onClick={handleAdvance} disabled={isAdvancing}>
              {isAdvancing ? 'Salvando…' : ADVANCE_LABELS[order.status]}
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              Cancelar pedido
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={!canDelete}
            title={
              !isAdmin
                ? 'Só administradores podem excluir pedidos'
                : approvedPayment
                  ? 'Pedido tem pagamento aprovado — cancele e estorne antes de excluir'
                  : undefined
            }
          >
            Excluir pedido
          </Button>
        </div>
      </div>

      <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
        {order.status === 'cancelled' ? (
          <div className="rounded-md bg-[#f2e4e4] px-3 py-2 text-sm text-[#8c3d3d]">
            Pedido cancelado{order.cancelReason ? ` — ${order.cancelReason}` : ''}
          </div>
        ) : (
          <>
            <div className="flex items-center">
              {PROGRESS_STEPS.map((step, index) => {
                const currentIndex = progressStepIndex(order.status)
                const reached = index <= currentIndex
                return (
                  <div key={step} className="flex flex-1 flex-col items-center last:flex-none">
                    <div className="flex w-full items-center">
                      <div
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                          reached ? 'bg-navy text-white' : 'bg-[#ede8de] text-[#a39a8c]',
                        )}
                      >
                        {index + 1}
                      </div>
                      {index < PROGRESS_STEPS.length - 1 && (
                        <div className={cn('mx-1 h-0.5 flex-1', reached ? 'bg-navy' : 'bg-[#ede8de]')} />
                      )}
                    </div>
                    <span className="mt-1 text-center text-[10.5px] text-[#8c8375]">{step}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-text-meta mt-3 text-sm">{STATUS_MESSAGES[order.status]}</p>
          </>
        )}
      </div>

      <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
        <div className="text-navy-dark mb-3 text-sm font-semibold">Itens do pedido</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Metros</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.colorLabel ?? '—'}</TableCell>
                <TableCell>{item.meters}m</TableCell>
                <TableCell>{formatPriceBRL(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
          <div className="text-navy-dark mb-3 text-sm font-semibold">Rastreio</div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trackingCode">Código de rastreio</Label>
              <Input
                id="trackingCode"
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trackingUrl">URL de rastreio (opcional)</Label>
              <Input
                id="trackingUrl"
                value={trackingUrl}
                onChange={(event) => setTrackingUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between">
              {order.delivery?.trackingUrl ? (
                <a
                  href={order.delivery.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy inline-flex items-center gap-1 text-sm hover:underline"
                >
                  Abrir rastreamento <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <span />
              )}
              <Button size="sm" onClick={handleSaveTracking} disabled={isSavingTracking}>
                {isSavingTracking ? 'Salvando…' : 'Salvar rastreio'}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
          <div className="text-navy-dark mb-3 text-sm font-semibold">Cliente</div>
          <p className="text-sm">{order.customerName}</p>
          <p className="text-text-meta text-xs">{order.customerEmail}</p>
          {order.customerPhone && <p className="text-text-meta text-xs">{order.customerPhone}</p>}
          {order.shippingAddress && (
            <p className="text-text-meta mt-2 text-xs">
              {order.shippingAddress.street}, {order.shippingAddress.city} -{' '}
              {order.shippingAddress.state} · CEP {order.shippingAddress.zipCode}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
        <div className="text-navy-dark mb-3 text-sm font-semibold">Pagamento</div>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-meta">Forma de pagamento</span>
            <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-meta">Subtotal</span>
            <span>{formatPriceBRL(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-meta">Frete</span>
            <span>{order.shippingCost === 0 ? 'Grátis' : formatPriceBRL(order.shippingCost)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="text-brand-red flex justify-between">
              <span>Desconto (cupom)</span>
              <span>-{formatPriceBRL(order.discountTotal)}</span>
            </div>
          )}
          <div className="text-navy-dark mt-1 flex justify-between border-t border-[#ede8de] pt-1.5 font-semibold">
            <span>Total</span>
            <span>{formatPriceBRL(order.total)}</span>
          </div>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido #{order.orderNumber}</DialogTitle>
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
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido #{order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O pedido some da listagem, mas o registro fica
              guardado (exclusão lógica).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
