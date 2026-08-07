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
import { computeStockStatus } from '@/features/catalog/utils'
import { checkoutSchema, PAYMENT_METHODS, type CheckoutInput } from './schema'

export function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const { addOrFindAddress } = useAddresses()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const business = useBusinessInfo()
  const navigate = useNavigate()

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  const shipping = subtotal >= business.freeShippingThreshold ? 0 : business.flatShippingFee
  const discount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal, shipping) : 0
  const total = subtotal + shipping - discount

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: 'credit_card' },
  })

  const paymentMethod = watch('paymentMethod')

  const handleApplyCoupon = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, type, value, max_uses, used_count, expires_at, status')
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

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'paid',
          payment_method: data.paymentMethod,
          subtotal,
          shipping_cost: shipping,
          discount_total: discount,
          total,
          coupon_id: appliedCoupon?.id,
          shipping_address_id: address.id,
        })
        .select('id, order_number')
        .single()
      if (orderError) throw new Error(orderError.message)

      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: orderRow.id,
          product_id: item.productId,
          color_id: item.colorId,
          meters: item.meters,
          unit_price: item.pricePerMeter,
          total: item.meters * item.pricePerMeter,
        })),
      )
      if (itemsError) throw new Error(itemsError.message)

      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: orderRow.id,
        status: 'paid',
        changed_by_name: user.name,
      })
      if (historyError) throw new Error(historyError.message)

      // decremento de estoque é read-then-write client-side (não atômico) — mesmo
      // padrão já usado no ajuste manual de AdminStockPage, não uma exceção nova.
      for (const item of items) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_meters, min_stock_meters, status')
          .eq('id', item.productId)
          .single()
        if (productError) throw new Error(productError.message)

        const newStock = Number(product.stock_meters) - item.meters
        const newStatus = computeStockStatus(product.status, newStock, Number(product.min_stock_meters))

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_meters: newStock, status: newStatus })
          .eq('id', item.productId)
        if (updateError) throw new Error(updateError.message)

        const { error: movementError } = await supabase.from('stock_movements').insert({
          product_id: item.productId,
          quantity: -item.meters,
          reason: `Venda #${orderRow.order_number}`,
          user_id: user.id,
          performed_by_name: user.name,
        })
        if (movementError) throw new Error(movementError.message)
      }

      if (appliedCoupon) {
        const { error: couponError } = await supabase.rpc('increment_coupon_usage', {
          p_coupon_id: appliedCoupon.id,
        })
        if (couponError) throw new Error(couponError.message)
      }

      clear()
      await queryClient.invalidateQueries({ queryKey: ['products'] })
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

  if (items.length === 0) return null

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
              <div className="flex flex-col gap-1.5">
                <Input placeholder="Número do cartão" {...register('cardNumber')} />
                {errors.cardNumber && (
                  <p className="text-destructive text-xs">{errors.cardNumber.message}</p>
                )}
              </div>
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
          <div className="text-text-body mb-2.5 flex justify-between text-sm">
            <span>Frete</span>
            <span>{shipping === 0 ? 'Grátis' : formatPriceBRL(shipping)}</span>
          </div>
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
