import { Check } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatPriceBRL } from '@/lib/format'
import { useOrders } from '@/features/orders/OrdersContext'

export function ConfirmationPage() {
  const { id } = useParams()
  const { orders } = useOrders()
  const order = orders.find((item) => item.id === id)

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-24 text-center">
      <div className="bg-navy mx-auto mb-7 flex size-16 items-center justify-center rounded-full text-white">
        <Check className="size-7" />
      </div>
      <h1 className="text-navy-dark mb-3.5 font-serif text-[30px] font-medium">Pedido confirmado!</h1>
      <p className="text-text-body mb-2 text-[14.5px] leading-relaxed">
        Obrigado por comprar na Jomar Tecidos. Seu pedido{' '}
        <strong>#{order?.orderNumber ?? id}</strong> está sendo preparado.
      </p>
      <p className="text-text-body mb-8 text-[14.5px] leading-relaxed">
        Você receberá atualizações por e-mail e poderá acompanhar o status a qualquer momento.
      </p>

      {order && (
        <div className="border-border mb-8 rounded-md border bg-white p-6 text-left">
          {order.items.map((item) => (
            <div key={item.id} className="text-text-body mb-2.5 flex justify-between text-[13px]">
              <span>
                {item.productName} ({item.meters}m)
              </span>
              <span>{formatPriceBRL(item.total)}</span>
            </div>
          ))}
          <div className="text-text-body mt-3 flex justify-between border-t border-border pt-3 text-[13px]">
            <span>Subtotal</span>
            <span>{formatPriceBRL(order.subtotal)}</span>
          </div>
          <div className="text-text-body mt-2 flex justify-between text-[13px]">
            <span>Frete</span>
            <span>{order.shippingCost === 0 ? 'Grátis' : formatPriceBRL(order.shippingCost)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="text-brand-red mt-2 flex justify-between text-[13px]">
              <span>Desconto</span>
              <span>-{formatPriceBRL(order.discountTotal)}</span>
            </div>
          )}
          <div className="text-navy-dark mt-2 flex justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{formatPriceBRL(order.total)}</span>
          </div>
        </div>
      )}

      <Link to="/">
        <Button size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
          Voltar à loja
        </Button>
      </Link>
    </main>
  )
}
