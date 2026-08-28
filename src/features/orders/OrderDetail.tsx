import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { orderQueryOptions } from '@/features/orders/queries'
import type { Order } from '@/features/orders/types'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  ORDER_PAYMENT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PROGRESS_STEPS,
  progressStepIndex,
  STATUS_MESSAGES,
} from '@/features/orders/data'
import { createAsaasCharge, chargeAsaasCard, chargeAsaasWithSavedCard } from '@/features/asaas/service'
import { useSavedCards } from '@/features/asaas/hooks'
import { RetryCardFields } from '@/features/asaas/RetryCardFields'
import { cardChargeSchema, type CardChargeInput } from '@/features/asaas/cardChargeSchema'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

const ONE_DAY_MS = 24 * 60 * 60 * 1000
// Mesmo limiar usado no checkout (CheckoutPage.tsx) — abaixo disso a parcela
// fica irrisória, só oferece 2x/3x a partir daqui.
const MIN_INSTALLMENT_TOTAL = 30

const pixExpirationDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

// QR dinâmico com chave Pix cadastrada na Asaas vale 12 meses (documentado) —
// bem diferente do QR "pagamento imediato" sem chave, que expira no mesmo
// dia. Ticar segundo a segundo por um ano é ruído de render sem propósito
// pro cliente; só faz sentido contar regressivamente quando a expiração está
// de fato próxima (<24h), caso contrário mostra a data-limite parada.
function PixCountdown({ expiresAt }: { expiresAt: string }) {
  const expiresAtMs = new Date(expiresAt).getTime()
  const [now, setNow] = useState(() => Date.now())
  const isFar = expiresAtMs - now > ONE_DAY_MS

  useEffect(() => {
    if (isFar) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isFar])

  if (isFar) {
    return (
      <p className="text-text-meta mt-2 text-xs">
        Válido até{' '}
        <span className="text-navy-dark font-semibold">
          {pixExpirationDateFormatter.format(expiresAtMs)}
        </span>
      </p>
    )
  }

  const msLeft = expiresAtMs - now

  if (msLeft <= 0) {
    return (
      <p className="text-destructive mt-2 text-xs font-medium">
        Código expirado — gere uma nova cobrança.
      </p>
    )
  }

  return (
    <p className="text-text-meta mt-2 text-xs">
      Expira em{' '}
      <span className="text-navy-dark font-semibold tabular-nums">{formatCountdown(msLeft)}</span>
    </p>
  )
}

// Retentativa de cobrança pra pedido de cartão — bug real corrigido aqui:
// antes, "Gerar cobrança" chamava createAsaasCharge (fluxo de fatura
// hospedada Pix/boleto) mesmo pra paymentMethod === 'credit_card', criando
// uma cobrança sem UI nenhuma pra completar (invoiceUrl que nunca aparecia em
// lugar algum) e ainda travando novas tentativas (order_payments já existia).
// Cartão de crédito autoriza na hora — precisa do form de verdade, igual ao
// checkout, não do fluxo assíncrono de invoiceUrl.
function CreditCardRetryForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const queryClient = useQueryClient()
  const { data: savedCards = [] } = useSavedCards()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CardChargeInput>({
    resolver: zodResolver(cardChargeSchema),
    defaultValues: { installments: 1 },
  })
  const savedCardId = watch('savedCardId')
  const installments = watch('installments')

  // Mesmo padrão de hidratação usado no checkout (CheckoutPage.tsx) —
  // pré-seleciona o cartão salvo mais recente assim que a lista carrega.
  const [savedCardsHydrated, setSavedCardsHydrated] = useState(false)
  if (!savedCardsHydrated && savedCards.length > 0) {
    setSavedCardsHydrated(true)
    setValue('savedCardId', savedCards[0].id)
  }

  const onSubmit = async (data: CardChargeInput) => {
    try {
      if (data.savedCardId) {
        await chargeAsaasWithSavedCard(order.id, data.savedCardId, data.installments)
      } else {
        await chargeAsaasCard({
          orderId: order.id,
          installments: data.installments,
          card: {
            holderName: data.cardHolderName ?? '',
            number: data.cardNumber ?? '',
            expiryMonth: (data.cardExpiry ?? '').split('/')[0] ?? '',
            expiryYear: `20${(data.cardExpiry ?? '').split('/')[1] ?? ''}`,
            ccv: data.cardCvv ?? '',
          },
          holderInfo: {
            postalCode: data.cardPostalCode ?? '',
            addressNumber: data.cardAddressNumber ?? '',
            addressComplement: data.cardAddressComplement,
          },
          saveCard: data.saveCard ?? false,
        })
        if (data.saveCard) {
          await queryClient.invalidateQueries({ queryKey: ['asaas', 'saved-cards'] })
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['orders', order.id] })
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a cobrança')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      {savedCards.length > 0 && (
        <div className="flex flex-col gap-2">
          {savedCards.map((card) => (
            <label
              key={card.id}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2.5 text-sm',
                savedCardId === card.id ? 'border-navy bg-navy/5' : 'border-input text-text-body',
              )}
            >
              <input
                type="radio"
                name="retrySavedCard"
                className="accent-navy"
                checked={savedCardId === card.id}
                onChange={() => setValue('savedCardId', card.id)}
              />
              <span>
                •••• •••• •••• {card.lastFourDigits}
                {card.brand && <span className="text-text-meta ml-1.5 uppercase">{card.brand}</span>}
              </span>
            </label>
          ))}
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2.5 text-sm',
              !savedCardId ? 'border-navy bg-navy/5' : 'border-input text-text-body',
            )}
          >
            <input
              type="radio"
              name="retrySavedCard"
              className="accent-navy"
              checked={!savedCardId}
              onChange={() => setValue('savedCardId', undefined)}
            />
            Usar outro cartão
          </label>
        </div>
      )}
      {!savedCardId && <RetryCardFields register={register} setValue={setValue} errors={errors} />}
      {order.total >= MIN_INSTALLMENT_TOTAL && (
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue('installments', n)}
              className={cn(
                'flex-1 rounded-sm border px-2 py-2 text-center text-xs',
                installments === n ? 'border-navy bg-navy/5 text-navy' : 'border-input text-text-body',
              )}
            >
              {n === 1 ? 'À vista' : `${n}x de ${formatPriceBRL(order.total / n)}`}
            </button>
          ))}
        </div>
      )}
      <Button type="submit" disabled={isSubmitting} className="h-auto rounded-sm py-3 text-sm">
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Processando pagamento…
          </>
        ) : (
          'Confirmar pagamento'
        )}
      </Button>
    </form>
  )
}

interface OrderDetailProps {
  id: string | undefined
  // Só faz sentido em /pedido/:id (chegou direto do checkout, fora do shell
  // de conta) — dentro de /conta/pedidos/:id o sidebar já mostra "Meus
  // Pedidos" ativo, o link ficaria redundante.
  showBackToOrders?: boolean
}

// Conteúdo puro do detalhe de pedido, sem <main>/layout — usado tanto pela
// página standalone pós-checkout (/pedido/:id) quanto pela rota aninhada em
// /conta (/conta/pedidos/:id, dentro do AccountLayout), pra não duplicar
// nenhuma das duas nem divergir uma da outra com o tempo.
export function OrderDetail({ id, showBackToOrders = false }: OrderDetailProps) {
  const queryClient = useQueryClient()
  const [isRetrying, setIsRetrying] = useState(false)
  const [showCardRetry, setShowCardRetry] = useState(false)

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

  const refundedTotal = order?.refunds.reduce((sum, refund) => sum + refund.amount, 0) ?? 0

  return (
    <div>
      {showBackToOrders && (
        <Link
          to="/conta/pedidos"
          className="text-navy mb-4 inline-flex items-center gap-1.5 rounded-md border border-[#e4ddd0] bg-white px-3 py-2 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Voltar pra Meus Pedidos
        </Link>
      )}

      {!order ? (
        <p className="text-text-meta text-sm">Carregando…</p>
      ) : (
        <>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3 rounded-md border border-[#e4ddd0] bg-white p-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-navy-dark font-serif text-xl font-semibold">
                  Pedido #{order.orderNumber}
                </h1>
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
          </div>

          <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
            {order.status === 'cancelled' ? (
              <div className="rounded-md bg-[#f2e4e4] px-3 py-2 text-sm text-[#8c3d3d]">
                Pedido cancelado{order.cancelReason ? ` — ${order.cancelReason}` : ''}
              </div>
            ) : order.status === 'refunded' ? (
              <div className="rounded-md bg-[#f2e4e4] px-3 py-2 text-sm text-[#8c3d3d]">
                Pedido reembolsado — {formatPriceBRL(refundedTotal)} devolvido
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
                            <div
                              className={cn(
                                'mx-1 h-0.5 flex-1',
                                reached ? 'bg-navy' : 'bg-[#ede8de]',
                              )}
                            />
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

          {order.status === 'pending' && !order.payment && (
            <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
              <p className="text-text-body mb-2.5 text-sm">
                Não foi possível gerar a cobrança automaticamente ao confirmar o pedido.
              </p>
              {order.paymentMethod === 'credit_card' ? (
                showCardRetry ? (
                  <CreditCardRetryForm order={order} onDone={() => setShowCardRetry(false)} />
                ) : (
                  <Button onClick={() => setShowCardRetry(true)}>Tentar pagamento novamente</Button>
                )
              ) : (
                <Button onClick={handleRetryCharge} disabled={isRetrying}>
                  {isRetrying ? 'Gerando…' : 'Gerar cobrança'}
                </Button>
              )}
            </div>
          )}

          {order.payment?.paymentMethod === 'pix' && order.payment.status === 'pending' && (
            <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
              <p className="text-navy-dark mb-2.5 text-sm font-semibold">
                Pague com Pix pra confirmar o pedido
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                {order.payment.pixQrCode && (
                  <img
                    src={`data:image/png;base64,${order.payment.pixQrCode}`}
                    alt="QR code Pix"
                    className="size-32 shrink-0"
                  />
                )}
                <div className="flex w-full flex-col gap-2">
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
                  {!order.payment.pixQrCode &&
                    !order.payment.pixCopyPaste &&
                    order.payment.invoiceUrl && (
                      <a
                        href={order.payment.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-navy text-sm hover:underline"
                      >
                        Abrir opções de pagamento
                      </a>
                    )}
                  {order.payment.pixExpiration && (
                    <PixCountdown expiresAt={order.payment.pixExpiration} />
                  )}
                  <p className="text-text-meta text-xs">
                    A confirmação costuma ser automática em segundos após o pagamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {order.payment?.paymentMethod === 'boleto' && order.payment.status === 'pending' && (
            <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
              <p className="text-navy-dark mb-2.5 text-sm font-semibold">
                Pague o boleto pra confirmar o pedido
              </p>
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
              <p className="text-text-meta mt-1.5 text-xs">
                A confirmação pode levar até 3 dias úteis após o pagamento.
              </p>
            </div>
          )}

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

          <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
              <div className="text-navy-dark mb-3 text-sm font-semibold">Rastreio</div>
              {order.delivery?.melhorEnvioLabelUrl && (
                <a
                  href={order.delivery.melhorEnvioLabelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border mb-2 flex items-center justify-between rounded-sm border px-3 py-2 text-sm hover:bg-[#faf7f0]"
                >
                  Etiqueta gerada — abrir PDF
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              {order.delivery && (order.delivery.carrier || order.delivery.trackingCode) ? (
                <>
                  <p className="text-text-body text-sm">
                    {DELIVERY_STATUS_LABELS[order.delivery.status]}
                    {order.delivery.carrier && ` · ${order.delivery.carrier}`}
                  </p>
                  {order.delivery.trackingCode && (
                    <p className="text-text-meta mt-1 text-xs">
                      Código: <span className="font-medium">{order.delivery.trackingCode}</span>
                    </p>
                  )}
                  {order.delivery.trackingUrl && (
                    <a
                      href={order.delivery.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-navy mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      Abrir rastreamento <ExternalLink className="size-3" />
                    </a>
                  )}
                  {order.delivery.etaDate && (
                    <p className="text-text-meta mt-1 text-xs">
                      Previsão de entrega: {dateFormatter.format(new Date(order.delivery.etaDate))}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-text-meta text-sm">
                  Ainda sem código de rastreio — aparece aqui assim que o pedido for enviado.
                </p>
              )}
            </div>

            <div className="rounded-md border border-[#e4ddd0] bg-white p-5">
              <div className="text-navy-dark mb-3 text-sm font-semibold">Endereço de entrega</div>
              {order.shippingAddress ? (
                <p className="text-text-body text-sm">
                  {order.shippingAddress.street}, {order.shippingAddress.city} -{' '}
                  {order.shippingAddress.state} · CEP {order.shippingAddress.zipCode}
                </p>
              ) : (
                <p className="text-text-meta text-sm">Endereço não informado.</p>
              )}
            </div>
          </div>

          <div className="mb-[18px] rounded-md border border-[#e4ddd0] bg-white p-5">
            <div className="text-navy-dark mb-3 text-sm font-semibold">Pagamento</div>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-meta">Forma de pagamento</span>
                <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
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
              {order.payment && (
                <div className="mt-2 flex justify-between border-t border-[#ede8de] pt-1.5">
                  <span className="text-text-meta">Status da cobrança</span>
                  <span>
                    {ORDER_PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}
                  </span>
                </div>
              )}
              {order.payment && order.payment.installmentCount > 1 && (
                <div className="flex justify-between">
                  <span className="text-text-meta">Parcelamento</span>
                  <span>
                    {order.payment.installmentCount}x de{' '}
                    {formatPriceBRL(order.payment.amount / order.payment.installmentCount)}
                  </span>
                </div>
              )}
              {order.refunds.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 border-t border-[#ede8de] pt-1.5">
                  <span className="text-text-meta">Reembolsos</span>
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="text-text-meta flex justify-between text-xs">
                      <span>
                        {dateTimeFormatter.format(new Date(refund.createdAt))} · {refund.reason}
                      </span>
                      <span>{formatPriceBRL(refund.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link to="/">
            <Button size="lg" className="h-auto rounded-sm px-8 py-3 text-sm">
              Voltar à loja
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
