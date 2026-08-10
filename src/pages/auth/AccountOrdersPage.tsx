import { cn } from '@/lib/utils'
import { formatPriceBRL } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyOrders } from '@/features/orders/hooks'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/features/orders/data'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export function AccountOrdersPage() {
  const { user } = useAuth()
  const { data: orders = [] } = useMyOrders(user?.id)

  return (
    <div className="border-border overflow-hidden rounded-md border bg-white">
      {orders.map((order) => (
        <div key={order.id} className="border-border border-b px-5 py-4 last:border-b-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-navy-dark text-sm font-semibold">#{order.orderNumber}</div>
              <div className="text-text-meta mt-0.5 text-xs">
                {dateFormatter.format(new Date(order.createdAt))} · {order.items.length}{' '}
                {order.items.length === 1 ? 'item' : 'itens'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={cn('rounded-full px-2.5 py-1 text-xs', ORDER_STATUS_STYLES[order.status])}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <div className="text-navy w-20 text-right text-sm font-medium">{formatPriceBRL(order.total)}</div>
            </div>
          </div>
          {order.delivery && (order.delivery.carrier || order.delivery.trackingCode) && (
            <div className="text-text-meta mt-2 text-xs">
              Rastreio: {[order.delivery.carrier, order.delivery.trackingCode].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
