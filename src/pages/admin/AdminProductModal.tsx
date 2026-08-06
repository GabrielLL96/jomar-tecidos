import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { CATEGORY_DISPLAY } from '@/features/catalog/data'
import { useCompositions } from '@/features/catalog/hooks'
import { uploadProductImage } from '@/features/catalog/productImagesQueries'

const decimalPtBR = (val: unknown) => (typeof val === 'string' ? val.replace(',', '.') : val)

const productFormSchema = z.object({
  name: z.string().min(3, 'Informe o nome do produto'),
  categorySlug: z.string().min(1, 'Selecione uma categoria'),
  widthM: z.preprocess(decimalPtBR, z.coerce.number().positive('Informe uma largura válida')),
  pricePerMeter: z.preprocess(decimalPtBR, z.coerce.number().positive('Informe um preço válido')),
  stockMeters: z.preprocess(decimalPtBR, z.coerce.number().min(0, 'Informe o estoque inicial')),
  description: z.string().optional(),
})

const TAG_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'Novo', label: 'Novo' },
  { value: 'Premium', label: 'Premium' },
] as const

type ProductFormInput = z.input<typeof productFormSchema>
type ProductFormOutput = z.output<typeof productFormSchema>

const COLOR_OPTIONS = ['#e0d3b6', '#cfe0e0', '#e0c7d3', '#8c9a7c', '#4a5a6a', '#c13a2e', '#1c1a5e', '#1a1a1a']
const CATEGORY_OPTIONS = Object.keys(CATEGORY_DISPLAY)

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface AdminProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminProductModal({ open, onOpenChange }: AdminProductModalProps) {
  const queryClient = useQueryClient()
  const { data: compositions = [] } = useCompositions()

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
  const [tag, setTag] = useState<(typeof TAG_OPTIONS)[number]['value']>('none')
  const [isBestseller, setIsBestseller] = useState(false)
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      reset()
      setCompositionPct({})
      setSelectedColors([])
      setTag('none')
      setIsBestseller(false)
      setPendingImages([])
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

  const pendingImageUrls = useMemo(
    () => pendingImages.map((file) => URL.createObjectURL(file)),
    [pendingImages],
  )
  useEffect(() => {
    return () => pendingImageUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [pendingImageUrls])

  const onSubmit = async (data: ProductFormOutput) => {
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

    setIsSaving(true)
    try {
      const { data: created, error: productError } = await supabase
        .from('products')
        .insert({
          sku: `ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          slug: slugify(data.name),
          name: data.name,
          category_slug: data.categorySlug,
          description: data.description ?? '',
          price_per_meter: data.pricePerMeter,
          width_m: data.widthM,
          stock_meters: data.stockMeters,
          min_sale_meters: 0.5,
          status: data.stockMeters > 0 ? 'active' : 'out_of_stock',
          tag: tag === 'none' ? null : tag,
          is_bestseller: isBestseller,
        })
        .select('id')
        .single()
      if (productError) throw new Error(productError.message)

      const { error: compositionsError } = await supabase.from('product_compositions').insert(
        compositionIds.map((compositionId) => ({
          product_id: created.id,
          composition_id: compositionId,
          percentage: compositionPct[compositionId],
        })),
      )
      if (compositionsError) throw new Error(compositionsError.message)

      const { error: colorsError } = await supabase.from('product_colors').insert(
        selectedColors.map((hex, index) => ({
          product_id: created.id,
          label: `Cor ${index + 1}`,
          hex,
        })),
      )
      if (colorsError) throw new Error(colorsError.message)

      for (let index = 0; index < pendingImages.length; index += 1) {
        await uploadProductImage(created.id, pendingImages[index], index)
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(`${data.name} cadastrado`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o produto')
    } finally {
      setIsSaving(false)
    }
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
              {compositions.map((composition) => {
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Selo</Label>
              <Select value={tag} onValueChange={(value) => setTag(value as typeof tag)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Destaque</Label>
              <label className="border-input flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-[13px]">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(event) => setIsBestseller(event.target.checked)}
                />
                Mais vendido
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Imagens do produto</Label>
            <div className="flex flex-wrap gap-2.5">
              {pendingImages.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative size-16 shrink-0">
                  <img
                    src={pendingImageUrls[index]}
                    alt=""
                    className="size-16 rounded-sm border border-[#e4ddd0] object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => setPendingImages((current) => current.filter((_, i) => i !== index))}
                    className="bg-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <label className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-[#d8d0c0] text-[11px] text-[#a39a8c]">
                + Adicionar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? [])
                    setPendingImages((current) => [...current, ...files])
                    event.target.value = ''
                  }}
                />
              </label>
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando…' : 'Salvar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
