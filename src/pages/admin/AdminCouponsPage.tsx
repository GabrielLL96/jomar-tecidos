import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAdminCoupons } from '@/features/orders/hooks'
import { couponValueLabel } from '@/features/orders/coupon-utils'
import { COUPON_STATUS_LABELS, COUPON_TYPE_LABELS } from '@/features/orders/data'
import type { Coupon, CouponStatus, CouponType } from '@/features/orders/types'

const COUPON_STATUS_STYLES: Record<CouponStatus, string> = {
  active: 'bg-[#e2f2e6] text-[#1e7a44]',
  scheduled: 'bg-[#fbeed4] text-[#a3660a]',
  expired: 'bg-[#f2ede4] text-[#8c8375]',
  depleted: 'bg-[#fbe2df] text-[#b0362b]',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

const TYPE_OPTIONS: CouponType[] = ['percentage', 'fixed', 'free_shipping']
const STATUS_OPTIONS: CouponStatus[] = ['active', 'scheduled', 'expired', 'depleted']

interface CouponFormState {
  code: string
  type: CouponType
  value: string
  maxUses: string
  expiresAt: string
  status: CouponStatus
}

const EMPTY_FORM: CouponFormState = {
  code: '',
  type: 'percentage',
  value: '',
  maxUses: '',
  expiresAt: '',
  status: 'active',
}

export function AdminCouponsPage() {
  const { data: coupons = [], isLoading } = useAdminCoupons()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['coupons'] })

  const openCreate = () => {
    setEditingCoupon(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      maxUses: coupon.maxUses !== undefined ? String(coupon.maxUses) : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      status: coupon.status,
    })
    setFormOpen(true)
  }

  const setField = <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase()
    if (!code) {
      toast.error('Informe o código do cupom')
      return
    }
    const value = form.type === 'free_shipping' ? 0 : Number(form.value.replace(',', '.'))
    if (form.type !== 'free_shipping' && (Number.isNaN(value) || value < 0)) {
      toast.error('Informe um valor válido')
      return
    }
    const maxUses = form.maxUses.trim() ? Number(form.maxUses) : null
    if (maxUses !== null && (Number.isNaN(maxUses) || maxUses <= 0)) {
      toast.error('Limite de usos precisa ser maior que zero')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        code,
        type: form.type,
        value,
        max_uses: maxUses,
        expires_at: form.expiresAt || null,
        status: form.status,
      }
      const { error } = editingCoupon
        ? await supabase.from('coupons').update(payload).eq('id', editingCoupon.id)
        : await supabase.from('coupons').insert(payload)

      if (error) {
        toast.error(error.code === '23505' ? `Já existe um cupom "${code}"` : error.message)
        return
      }

      toast.success(editingCoupon ? 'Cupom atualizado' : 'Cupom criado')
      setFormOpen(false)
      await invalidate()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-[18px] flex justify-end">
        <Button onClick={openCreate}>+ Novo cupom</Button>
      </div>

      <div className="overflow-hidden rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Carregando…</TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <p className="text-text-meta text-sm">Nenhum cupom cadastrado ainda.</p>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-semibold">{coupon.code}</TableCell>
                  <TableCell>{COUPON_TYPE_LABELS[coupon.type]}</TableCell>
                  <TableCell>{couponValueLabel(coupon.type, coupon.value)}</TableCell>
                  <TableCell>
                    {coupon.usedCount}/{coupon.maxUses ?? '∞'}
                  </TableCell>
                  <TableCell>
                    {coupon.expiresAt ? dateFormatter.format(new Date(coupon.expiresAt)) : 'Sem validade'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        COUPON_STATUS_STYLES[coupon.status],
                      )}
                    >
                      {COUPON_STATUS_LABELS[coupon.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openEdit(coupon)}
                      className="text-navy text-[12.5px] hover:text-primary"
                    >
                      Editar
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="couponCode">Código</Label>
              <Input
                id="couponCode"
                placeholder="Ex: BEMVINDO10"
                value={form.code}
                onChange={(event) => setField('code', event.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(value) => setField('type', value as CouponType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {COUPON_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponValue">
                  {form.type === 'percentage' ? 'Valor (%)' : 'Valor (R$)'}
                </Label>
                <Input
                  id="couponValue"
                  placeholder={form.type === 'percentage' ? '10' : '0,00'}
                  value={form.value}
                  onChange={(event) => setField('value', event.target.value)}
                  disabled={form.type === 'free_shipping'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponMaxUses">Limite de usos</Label>
                <Input
                  id="couponMaxUses"
                  placeholder="Sem limite"
                  value={form.maxUses}
                  onChange={(event) => setField('maxUses', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponExpiresAt">Validade</Label>
                <Input
                  id="couponExpiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setField('expiresAt', event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setField('status', value as CouponStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {COUPON_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-text-meta text-xs">
                Cotação no checkout também confere validade/data/limite de uso real — mudar aqui não
                reativa um cupom expirado ou esgotado de fato.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
