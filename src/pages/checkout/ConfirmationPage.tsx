import { useState } from 'react'
import { Check } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatPriceBRL } from '@/lib/format'
import { orderQueryOptions } from '@/features/orders/queries'
import { createAsaasCharge } from '@/features/asaas/service'

export function ConfirmationPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [isRetrying, setIsRetrying] = useState(false)

  // Pix ainda não confirmado: refetch curto pra pegar a confirmação do
  // webhook sem exigir F5 do cliente. Qualquer outro caso (boleto, cartão,
  // já confirmado) não precisa de polling — boleto leva dias, cartão volta
  // via redirect com o dado já fresco.
  const { data: order } = useQuery({
    ...orderQueryOptions(id ?? ''),
    refetchInterval: (query) => {
      const current = query.state.data
      const isPendingPix = current?.status === 'pending' && current.payment?.paymentMethod === 'pix'
      return isPendingPix ? 5000 : false
    },
  })

  const handleRetryCharge = async () => {
    if (!order) return
    setIsRetrying(true)
    try {
      await createAsaasCharge(order.id, order.paymentMethod)
      await queryClient.invalidateQueries({ queryKey: ['orders', order.id] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a cobrança')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-24 text-center">
      <div className="bg-navy mx-auto mb-7 flex size-16 items-center justify-center rounded-full text-white">
        <Check className="size-7" />
      </div>
      <h1 className="text-navy-dark mb-3.5 font-serif text-3xl font-medium">
        {order?.status === 'pending' ? 'Pedido recebido!' : 'Pedido confirmado!'}
      </h1>
      <p className="text-text-body mb-2 text-sm leading-relaxed">
        Obrigado por comprar na Jomar Tecidos. Seu pedido <strong>#{order?.orderNumber ?? id}</strong>{' '}
        {order?.status === 'pending' ? 'está aguardando confirmação do pagamento.' : 'está sendo preparado.'}
      </p>
      <p className="text-text-body mb-8 text-sm leading-relaxed">
        Você receberá atualizações por e-mail e poderá acompanhar o status a qualquer momento.
      </p>

      {order && order.status === 'pending' && !order.payment && (
        <div className="border-border mb-8 rounded-md border bg-white p-6 text-left">
          <p className="text-text-body mb-3 text-sm">
            Não foi possível gerar a cobrança automaticamente ao confirmar o pedido.
          </p>
          <Button onClick={handleRetryCharge} disabled={isRetrying}>
            {isRetrying ? 'Gerando…' : 'Gerar cobrança'}
          </Button>
        </div>
      )}

      {order?.payment?.paymentMethod === 'pix' && order.payment.status === 'pending' && (
        <div className="border-border mb-8 rounded-md border bg-white p-6 text-left">
          <p className="text-navy-dark mb-3 text-sm font-semibold">Pague com Pix pra confirmar o pedido</p>
          {order.payment.pixQrCode && (
            <img
              src={`data:image/png;base64,${order.payment.pixQrCode}`}
              alt="QR code Pix"
              className="mx-auto mb-3 size-48"
            />
          )}
          {order.payment.pixCopyPaste && (
            <div className="flex flex-col gap-1.5">
              <p className="text-text-meta text-xs">Ou copie o código:</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={order.payment.pixCopyPaste}
                  onFocus={(event) => event.target.select()}
                  className="border-border flex-1 truncate rounded-sm border px-2.5 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(order.payment!.pixCopyPaste!)
                    toast.success('Código copiado')
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}
          {!order.payment.pixQrCode && !order.payment.pixCopyPaste && order.payment.invoiceUrl && (
            <a
              href={order.payment.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-navy text-sm hover:underline"
            >
              Abrir opções de pagamento
            </a>
          )}
          <p className="text-text-meta mt-3 text-xs">
            A confirmação costuma ser automática em segundos após o pagamento.
          </p>
        </div>
      )}

      {order?.payment?.paymentMethod === 'boleto' && order.payment.status === 'pending' && (
        <div className="border-border mb-8 rounded-md border bg-white p-6 text-left">
          <p className="text-navy-dark mb-3 text-sm font-semibold">Pague o boleto pra confirmar o pedido</p>
          {order.payment.boletoUrl && (
            <a
              href={order.payment.boletoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-navy text-sm hover:underline"
            >
              Abrir boleto para pagamento
            </a>
          )}
          <p className="text-text-meta mt-2 text-xs">
            A confirmação pode levar até 3 dias úteis após o pagamento.
          </p>
        </div>
      )}

      {order && (
        <div className="border-border mb-8 rounded-md border bg-white p-6 text-left">
          {order.items.map((item) => (
            <div key={item.id} className="text-text-body mb-2.5 flex justify-between text-sm">
              <span>
                {item.productName} ({item.meters}m)
              </span>
              <span>{formatPriceBRL(item.total)}</span>
            </div>
          ))}
          <div className="text-text-body mt-3 flex justify-between border-t border-border pt-3 text-sm">
            <span>Subtotal</span>
            <span>{formatPriceBRL(order.subtotal)}</span>
          </div>
          <div className="text-text-body mt-2 flex justify-between text-sm">
            <span>Frete</span>
            <span>{order.shippingCost === 0 ? 'Grátis' : formatPriceBRL(order.shippingCost)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="text-brand-red mt-2 flex justify-between text-sm">
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
