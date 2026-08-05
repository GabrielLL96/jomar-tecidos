import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { COMPOSITIONS, CATEGORY_DISPLAY } from '@/features/catalog/data'
import type { Product } from '@/features/catalog/types'

const decimalPtBR = (val: unknown) => (typeof val === 'string' ? val.replace(',', '.') : val)

const productFormSchema = z.object({
  name: z.string().min(3, 'Informe o nome do produto'),
  categorySlug: z.string().min(1, 'Selecione uma categoria'),
  widthM: z.preprocess(decimalPtBR, z.coerce.number().positive('Informe uma largura válida')),
  pricePerMeter: z.preprocess(decimalPtBR, z.coerce.number().positive('Informe um preço válido')),
  stockMeters: z.preprocess(decimalPtBR, z.coerce.number().min(0, 'Informe o estoque inicial')),
  description: z.string().optional(),
})

type ProductFormInput = z.input<typeof productFormSchema>
type ProductFormOutput = z.output<typeof productFormSchema>

const COLOR_OPTIONS = ['#e0d3b6', '#cfe0e0', '#e0c7d3', '#8c9a7c', '#4a5a6a', '#c13a2e', '#1c1a5e', '#1a1a1a']
const CATEGORY_OPTIONS = Object.keys(CATEGORY_DISPLAY)

interface AdminProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (product: Product) => void
}

export function AdminProductModal({ open, onOpenChange, onSave }: AdminProductModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { categorySlug: '' },
  })

  const [compositionPct, setCompositionPct] = useState<Record<string, number>>({})
  const [selectedColors, setSelectedColors] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      reset()
      setCompositionPct({})
      setSelectedColors([])
    }
  }, [open, reset])

  const toggleComposition = (id: string) => {
    setCompositionPct((current) => {
      const next = { ...current }
      if (id in next) delete next[id]
      else next[id] = 0
      return next
    })
  }

  const toggleColor = (hex: string) => {
    setSelectedColors((current) =>
      current.includes(hex) ? current.filter((c) => c !== hex) : [...current, hex],
    )
  }

  const compositionTotal = Object.values(compositionPct).reduce((total, pct) => total + pct, 0)

  const onSubmit = (data: ProductFormOutput) => {
    const compositionIds = Object.keys(compositionPct)
    if (compositionIds.length === 0) {
      toast.error('Selecione ao menos uma composição')
      return
    }
    if (compositionTotal !== 100) {
      toast.error('A soma das composições deve ser 100%')
      return
    }
    if (selectedColors.length === 0) {
      toast.error('Selecione ao menos uma cor')
      return
    }

    const id = crypto.randomUUID()
    const product: Product = {
      id,
      sku: `ADM-${id.slice(0, 8).toUpperCase()}`,
      slug: data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(new RegExp('[̀-ͯ]', 'g'), '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      name: data.name,
      categorySlug: data.categorySlug,
      compositions: compositionIds.map((compositionId) => ({
        compositionId,
        percentage: compositionPct[compositionId],
      })),
      pricePerMeter: data.pricePerMeter,
      widthM: data.widthM,
      stockMeters: data.stockMeters,
      minSaleMeters: 0.5,
      status: data.stockMeters > 0 ? 'active' : 'out_of_stock',
      colors: [selectedColors[0], selectedColors[1] ?? selectedColors[0]],
      description: data.description ?? '',
      colorOptions: selectedColors.map((hex, index) => ({
        id: `color-${id}-${index}`,
        label: `Cor ${index + 1}`,
        hex,
      })),
    }

    onSave(product)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[640px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Novo produto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome do produto</Label>
            <Input id="name" placeholder="Ex: Linho Belga Natural" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoria</Label>
            <Select
              value={watch('categorySlug')}
              onValueChange={(value) => setValue('categorySlug', value, { shouldValidate: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {CATEGORY_DISPLAY[slug].tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categorySlug && <p className="text-destructive text-xs">{errors.categorySlug.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label>Composição</Label>
              <span
                className={cn('text-[11.5px]', compositionTotal === 100 ? 'text-[#1e7a44]' : 'text-[#a3660a]')}
              >
                Total: {compositionTotal}%
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-[#ede8de] p-3">
              {COMPOSITIONS.map((composition) => {
                const checked = composition.id in compositionPct
                return (
                  <div key={composition.id} className="flex items-center gap-2.5">
                    <label className="flex w-[150px] cursor-pointer items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleComposition(composition.id)}
                      />
                      {composition.name}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!checked}
                      value={checked ? compositionPct[composition.id] : 0}
                      onChange={(event) => {
                        const value = Math.max(0, Math.min(100, Number(event.target.value) || 0))
                        setCompositionPct((current) => ({ ...current, [composition.id]: value }))
                      }}
                      className="w-[70px] rounded border border-[#d8d0c0] px-2 py-1.5 text-[13px] disabled:opacity-50"
                    />
                    <span className="text-[12.5px] text-[#8c8375]">%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="widthM">Largura (m)</Label>
              <Input id="widthM" placeholder="1,40" {...register('widthM')} />
              {errors.widthM && <p className="text-destructive text-xs">{errors.widthM.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricePerMeter">Preço/m (R$)</Label>
              <Input id="pricePerMeter" placeholder="0,00" {...register('pricePerMeter')} />
              {errors.pricePerMeter && <p className="text-destructive text-xs">{errors.pricePerMeter.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stockMeters">Estoque (m)</Label>
              <Input id="stockMeters" placeholder="0" {...register('stockMeters')} />
              {errors.stockMeters && <p className="text-destructive text-xs">{errors.stockMeters.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cores disponíveis</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => toggleColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    'size-[30px] rounded-full',
                    selectedColors.includes(hex) ? 'ring-navy ring-2 ring-offset-2' : 'ring-1 ring-[#d8d0c0]',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Composição, toque, indicações de uso…"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter className="border-t border-[#ede8de] pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar produto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
