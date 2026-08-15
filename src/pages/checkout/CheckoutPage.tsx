import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPriceBRL } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useBusinessInfo } from '@/features/site-settings/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/cart/CartContext'
import { useAddresses } from '@/features/account/AddressesContext'
import { calculateDiscount, isCouponValid } from '@/features/orders/coupon-utils'
import type { Coupon } from '@/features/orders/types'
import { useProducts } from '@/features/catalog/hooks'
import { useShippingQuote } from '@/features/melhor-envio/useShippingQuote'
import { createAsaasCharge, chargeAsaasCard } from '@/features/asaas/service'
import { CreditCardFields } from '@/features/asaas/CreditCardFields'
import { useSeoMeta } from '@/lib/seo'
import { checkoutSchema, PAYMENT_METHODS, type CheckoutInput } from './schema'

// Abaixo disso, parcela ficaria irrisória — só oferece 2x/3x a partir daqui.
const MIN_INSTALLMENT_TOTAL = 30

export function CheckoutPage() {
  useSeoMeta({ title: 'Finalizar Compra', description: 'Checkout Jomar Tecidos.', path: '/checkout', noindex: true })

  const { items, subtotal, clear } = useCart()
  const { addresses, addOrFindAddress } = useAddresses()
  const { user, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()
  const business = useBusinessInfo()
  const { data: products = [] } = useProducts()
  const navigate = useNavigate()

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  const isFreeShipping = subtotal >= business.freeShippingThreshold

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: 'credit_card', installments: 1 },
  })

  const paymentMethod = watch('paymentMethod')
  const installments = watch('installments')
  const zip = watch('zip')

  const {
    options: shippingOptions,
    selectedServiceId: selectedShippingServiceId,
    setSelectedServiceId: setSelectedShippingServiceId,
    quoteId: shippingQuoteId,
    isCalculating: isCalculatingShipping,
    error: shippingQuoteError,
    missingData: cartItemsMissingShippingData,
  } = useShippingQuote(zip, items, products, !isFreeShipping)

  const selectedShippingOption = shippingOptions.find((option) => option.serviceId === selectedShippingServiceId)
  const cheapestShippingPrice =
    shippingOptions.length > 0 ? Math.min(...shippingOptions.map((option) => option.price)) : null
  // sem cotação real escolhida, cai na taxa fixa (fallback já usado antes desta
  // feature existir) — nunca trava o checkout esperando integração conectada.
  const shipping = isFreeShipping ? 0 : (selectedShippingOption?.price ?? business.flatShippingFee)
  const discount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal, shipping) : 0
  const total = subtotal + shipping - discount

  // Pré-preenche o formulário de entrega com o endereço padrão do cliente
  // (definido no cadastro) assim que carrega — editável, não trava em nada.
  // Padrão "ajustar state durante o render" (guarda por id, sem useEffect) já
  // documentado no projeto pra hidratar form state a partir de dado async.
  const [prefilledAddressId, setPrefilledAddressId] = useState<string | null>(null)
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0]
  if (defaultAddress && defaultAddress.id !== prefilledAddressId) {
    setPrefilledAddressId(defaultAddress.id)
    setValue('fullName', user?.name ?? '')
    setValue('address', defaultAddress.street)
    setValue('city', defaultAddress.city)
    setValue('state', defaultAddress.state)
    setValue('zip', defaultAddress.zipCode)
  }

  const handleApplyCoupon = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, type, value, max_uses, used_count, starts_at, expires_at, status')
      .eq('code', couponCode.trim().toUpperCase())
      .maybeSingle()

    const coupon: Coupon | null = data
      ? {
          id: data.id,
          code: data.code,
          type: data.type,
          value: Number(data.value),
          maxUses: data.max_uses ?? undefined,
          usedCount: data.used_count,
          startsAt: data.starts_at ?? undefined,
          expiresAt: data.expires_at ?? undefined,
          status: data.status,
        }
      : null

    if (error || !coupon || !isCouponValid(coupon)) {
      setAppliedCoupon(null)
      setCouponError('Cupom inválido ou expirado')
      return
    }
    setAppliedCoupon(coupon)
    setCouponError(null)
  }

  const onSubmit = async (data: CheckoutInput) => {
    if (!user) {
      toast.error('Você precisa estar logado pra finalizar a compra')
      return
    }

    try {
      const address = await addOrFindAddress({
        label: 'Entrega',
        street: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip,
      })

      // Pedido inteiro (order + items + baixa de estoque + cupom + histórico)
      // é criado numa função security definer única (create_order, migration
      // 20260809000000) — roda em transação real: qualquer falha no meio
      // (estoque insuficiente, produto removido, cupom inválido) desfaz tudo,
      // em vez de deixar um pedido órfão com 0 itens (bug real documentado em
      // ADR-012/_Feedback.md). unit_price também não é mais enviado pelo
      // client — a função sempre lê o preço real de products.
      const { data: orderRows, error: orderError } = await supabase.rpc('create_order', {
        p_shipping_address_id: address.id,
        p_payment_method: data.paymentMethod,
        p_coupon_id: appliedCoupon?.id,
        p_shipping_cost: shipping,
        p_items: items.map((item) => ({
          product_id: item.productId,
          color_id: item.colorId ?? null,
          meters: item.meters,
        })),
        // Com cotação real escolhida, o servidor ignora p_shipping_cost e usa
        // o preço autoritativo salvo em shipping_quotes (ver create_order()).
        // Sem cotação (taxa fixa), esses dois ficam null e o servidor usa
        // p_shipping_cost mesmo — ver limitação conhecida no spec.
        p_shipping_quote_id: shippingQuoteId ?? undefined,
        p_shipping_service_id: selectedShippingServiceId ?? undefined,
      })
      if (orderError) throw new Error(orderError.message)

      const orderRow = orderRows?.[0]
      if (!orderRow) throw new Error('Pedido não pôde ser criado')

      // Pedido já existe e o estoque já foi baixado nesse ponto — limpar o
      // carrinho é seguro independente do resultado da cobrança abaixo.
      clear()
      await queryClient.invalidateQueries({ queryKey: ['products'] })

      try {
        if (data.paymentMethod === 'credit_card') {
          // Cobrança direta com o cartão digitado no próprio checkout —
          // autoriza na hora (sem redirect pra fatura hospedada). Dado de
          // cartão só existe no `data` deste submit, nunca persistido; a
          // Edge Function devolve status já resolvido (aprovado/recusado),
          // nunca "pending" esperando confirmação assíncrona. Ver ADR-016.
          await chargeAsaasCard({
            orderId: orderRow.id,
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
        } else {
          await createAsaasCharge(orderRow.id, data.paymentMethod)
        }
      } catch (chargeError) {
        // Pedido já existe (pending, sem cobrança) — a página de
        // confirmação oferece tentar gerar a cobrança de novo (Pix/boleto)
        // ou, pro cartão, cai de volta na fatura hospedada como alternativa.
        toast.error(
          chargeError instanceof Error
            ? chargeError.message
            : 'Não foi possível gerar a cobrança — tente novamente na página do pedido',
        )
      }

      navigate(`/pedido/${orderRow.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível finalizar o pedido')
    }
  }

  useEffect(() => {
    if (items.length === 0) navigate('/carrinho', { replace: true })
    // mount-only: verifica só a entrada na página, não deve reagir ao clear() do próprio submit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reativo (não mount-only) de propósito: isLoading começa true e vira false
  // assim que a sessão inicial resolve — precisa reagir a essa transição, não
  // só checar na entrada. Exige login/cadastro antes de chegar no formulário
  // de entrega (etapa 2 do checkout, spec 2026-08-13).
  useEffect(() => {
    if (!isAuthLoading && !user) navigate('/conta/entrar?redirect=/checkout', { replace: true })
  }, [user, isAuthLoading, navigate])

  if (items.length === 0 || isAuthLoading || !user) return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-lg) px-6 py-10 md:px-12">
      <h1 className="text-navy-dark mb-8 font-serif text-3xl font-medium">Finalizar compra</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_340px]"
      >
        <div className="flex flex-col gap-7">
          <div>
            <div className="text-navy-dark mb-3.5 text-sm font-semibold tracking-[0.05em] uppercase">
              1. Entrega
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" {...register('address')} />
                {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">UF</Label>
                <Input id="state" maxLength={2} {...register('state')} />
                {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="zip">CEP</Label>
                <Input id="zip" {...register('zip')} />
                {errors.zip && <p className="text-destructive text-xs">{errors.zip.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className="text-navy-dark mb-3.5 text-sm font-semibold tracking-[0.05em] uppercase">
              2. Pagamento
            </div>
            <div className="mb-3.5 flex gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setValue('paymentMethod', method.value)}
                  className={cn(
                    'flex-1 rounded-sm border px-3 py-3 text-center text-sm',
                    paymentMethod === method.value
                      ? 'border-navy bg-navy/5 text-navy'
                      : 'border-input text-text-body',
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'credit_card' && (
              <>
                <CreditCardFields register={register} setValue={setValue} errors={errors} />
                {total >= MIN_INSTALLMENT_TOTAL && (
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setValue('installments', n)}
                        className={cn(
                          'flex-1 rounded-sm border px-2 py-2 text-center text-xs',
                          installments === n
                            ? 'border-navy bg-navy/5 text-navy'
                            : 'border-input text-text-body',
                        )}
                      >
                        {n === 1 ? 'À vista' : `${n}x de ${formatPriceBRL(total / n)}`}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {paymentMethod === 'pix' && (
              <p className="text-text-meta text-xs">
                Ao confirmar, mostramos um QR code / código Pix copia-e-cola pra pagar na hora.
              </p>
            )}
            {paymentMethod === 'boleto' && (
              <p className="text-text-meta text-xs">
                Ao confirmar, geramos o boleto — o pagamento pode levar até 3 dias úteis pra ser confirmado.
              </p>
            )}
          </div>
        </div>

        <div className="bg-cream-secondary rounded-sm p-7">
          <div className="text-navy-dark mb-5 text-base font-semibold">Resumo do pedido</div>
          {items.map((item) => (
            <div key={item.id} className="text-text-body mb-2.5 flex justify-between text-sm">
              <span>
                {item.name} ({item.meters}m)
              </span>
              <span>{formatPriceBRL(item.meters * item.pricePerMeter)}</span>
            </div>
          ))}

          <div className="border-border mt-3 mb-3 flex gap-2 border-t pt-3.5">
            <Input
              placeholder="Cupom de desconto"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyCoupon}
              className="h-9 rounded-sm px-4 text-sm"
            >
              Aplicar
            </Button>
          </div>
          {couponError && <p className="text-destructive mb-2 text-xs">{couponError}</p>}
          {appliedCoupon && (
            <p className="text-navy mb-2 text-xs">Cupom {appliedCoupon.code} aplicado</p>
          )}

          <div className="text-text-body mb-2.5 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPriceBRL(subtotal)}</span>
          </div>
          {isFreeShipping ? (
            <div className="text-text-body mb-2.5 flex justify-between text-sm">
              <span>Frete</span>
              <span>Grátis</span>
            </div>
          ) : (
            <div className="mb-2.5">
              <div className="text-text-body mb-1.5 flex justify-between text-sm">
                <span>Frete</span>
                <span>
                  {formatPriceBRL(shipping)}
                  {!selectedShippingOption && ' (estimado)'}
                </span>
              </div>
              {cartItemsMissingShippingData ? (
                <p className="text-text-meta text-xs">
                  Cotação real indisponível pra este pedido — usando taxa estimada.
                </p>
              ) : isCalculatingShipping ? (
                <p className="text-text-meta text-xs">Calculando frete…</p>
              ) : shippingOptions.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {shippingOptions.map((option) => {
                    const isCheapest = option.price === cheapestShippingPrice
                    const isSelected = selectedShippingServiceId === option.serviceId
                    return (
                      <label
                        key={option.serviceId}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-sm border px-3 py-2 text-xs',
                          isSelected ? 'border-navy bg-navy/5' : 'border-border',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shippingOption"
                            className="accent-navy"
                            checked={isSelected}
                            onChange={() => setSelectedShippingServiceId(option.serviceId)}
                          />
                          <span>
                            <span className="text-foreground block font-medium">
                              {option.carrierName} {option.serviceName}
                            </span>
                            <span className="text-text-meta">
                              {option.deliveryDays ? `${option.deliveryDays} dias úteis` : 'Prazo não informado'}
                            </span>
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          {isCheapest && (
                            <span className="bg-navy rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Mais barato
                            </span>
                          )}
                          <span className="text-navy font-medium">{formatPriceBRL(option.price)}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                zip?.replace(/\D/g, '').length !== 8 && (
                  <p className="text-text-meta text-xs">Digite o CEP completo pra calcular o frete real.</p>
                )
              )}
              {shippingQuoteError && (
                <p className="text-destructive mt-1 text-xs">{shippingQuoteError}</p>
              )}
            </div>
          )}
          {discount > 0 && (
            <div className="text-brand-red mb-2.5 flex justify-between text-sm">
              <span>Desconto</span>
              <span>-{formatPriceBRL(discount)}</span>
            </div>
          )}
          <div className="text-navy-dark border-border mt-2 flex justify-between border-t pt-4 text-base font-semibold">
            <span>Total</span>
            <span>{formatPriceBRL(total)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-5 h-auto w-full rounded-sm py-4 text-sm">
            Confirmar pedido
          </Button>
        </div>
      </form>
    </main>
  )
}
