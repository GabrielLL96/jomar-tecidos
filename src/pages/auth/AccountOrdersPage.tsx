import { cn } from '@/lib/utils'
import { formatDateBR, formatPriceBRL } from '@/lib/format'
import { useOrders } from '@/features/orders/OrdersContext'
import { DELIVERY_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'

export function AccountOrdersPage() {
  const { orders, getDelivery } = useOrders()

  return (
    <div className="border-border overflow-hidden rounded-md border bg-white">
      {orders.map((order) => {
        const delivery = getDelivery(order.id)
        return (
          <div key={order.id} className="border-border border-b px-5 py-4 last:border-b-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-navy-dark text-[13.5px] font-semibold">#{order.orderNumber}</div>
                <div className="text-text-meta mt-0.5 text-xs">
                  {formatDateBR(order.createdAt)} · {order.items.length}{' '}
                  {order.items.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn('rounded-full px-2.5 py-1 text-[11.5px]', ORDER_STATUS_STYLES[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <div className="text-navy w-20 text-right text-sm font-medium">{formatPriceBRL(order.total)}</div>
              </div>
            </div>
            {delivery && (
              <div className="text-text-meta mt-2 text-[12px]">
                Rastreio: {delivery.carrier} · {delivery.trackingCode} ·{' '}
                {DELIVERY_STATUS_LABELS[delivery.status]}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
