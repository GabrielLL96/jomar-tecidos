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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { CATEGORY_DISPLAY, limitProductImageSelection, MAX_PRODUCT_IMAGES } from '@/features/catalog/data'
import { useCompositions } from '@/features/catalog/hooks'
import { uploadProductImage } from '@/features/catalog/productImagesQueries'
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

const TAG_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'Novo', label: 'Novo' },
  { value: 'Premium', label: 'Premium' },
] as const

type ProductFormInput = z.input<typeof productFormSchema>
type ProductFormOutput = z.output<typeof productFormSchema>
type FieldErrors = Partial<Record<keyof ProductFormOutput, unknown>>

const COLOR_OPTIONS = ['#e0d3b6', '#cfe0e0', '#e0c7d3', '#8c9a7c', '#4a5a6a', '#c13a2e', '#1c1a5e', '#1a1a1a']
const CATEGORY_OPTIONS = Object.keys(CATEGORY_DISPLAY)
const DADOS_FIELDS: (keyof ProductFormOutput)[] = [
  'name',
  'categorySlug',
  'widthM',
  'pricePerMeter',
  'stockMeters',
]

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
  product?: Product | null
}

export function AdminProductModal({ open, onOpenChange, product = null }: AdminProductModalProps) {
  const isEditing = product !== null
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

  const [activeTab, setActiveTab] = useState<'dados' | 'composicao' | 'imagens'>('dados')
  const [compositionSubTab, setCompositionSubTab] = useState<'selecionar' | 'nova'>('selecionar')
  const [newCompositionName, setNewCompositionName] = useState('')
  const [isCreatingComposition, setIsCreatingComposition] = useState(false)
  const [compositionPct, setCompositionPct] = useState<Record<string, number>>({})
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [tag, setTag] = useState<(typeof TAG_OPTIONS)[number]['value']>('none')
  const [isBestseller, setIsBestseller] = useState(false)
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      reset()
      setActiveTab('dados')
      setCompositionSubTab('selecionar')
      setNewCompositionName('')
      setCompositionPct({})
      setSelectedColors([])
      setTag('none')
      setIsBestseller(false)
      setPendingImages([])
      return
    }

    if (product) {
      reset({
        name: product.name,
        categorySlug: product.categorySlug,
        widthM: String(product.widthM).replace('.', ','),
        pricePerMeter: String(product.pricePerMeter).replace('.', ','),
        stockMeters: String(product.stockMeters).replace('.', ','),
        description: product.description,
      })
      setCompositionPct(
        Object.fromEntries(product.compositions.map((c) => [c.compositionId, c.percentage])),
      )
      setSelectedColors(product.colorOptions.map((c) => c.hex))
      setTag(product.tag ?? 'none')
      setIsBestseller(product.isBestseller)
    }
  }, [open, product, reset])

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

  const handleCreateComposition = async () => {
    const name = newCompositionName.trim()
    if (!name) return

    setIsCreatingComposition(true)
    try {
      const { data: created, error } = await supabase
        .from('compositions')
        .insert({ name })
        .select('id, name')
        .single()
      if (error) {
        throw new Error(
          error.code === '23505' ? `Já existe uma composição chamada "${name}"` : error.message,
        )
      }

      await queryClient.invalidateQueries({ queryKey: ['compositions'] })
      setCompositionPct((current) => ({ ...current, [created.id]: 0 }))
      setNewCompositionName('')
      setCompositionSubTab('selecionar')
      toast.success(`Composição "${created.name}" criada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a composição')
    } finally {
      setIsCreatingComposition(false)
    }
  }

  const pendingImageUrls = useMemo(
    () => pendingImages.map((file) => URL.createObjectURL(file)),
    [pendingImages],
  )
  useEffect(() => {
    return () => pendingImageUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [pendingImageUrls])

  const onInvalid = (formErrors: FieldErrors) => {
    if (DADOS_FIELDS.some((field) => formErrors[field])) setActiveTab('dados')
  }

  const onSubmit = async (data: ProductFormOutput) => {
    const compositionIds = Object.keys(compositionPct)
    if (compositionIds.length === 0) {
      setActiveTab('composicao')
      toast.error('Selecione ao menos uma composição')
      return
    }
    if (compositionTotal !== 100) {
      setActiveTab('composicao')
      toast.error('A soma das composições deve ser 100%')
      return
    }
    if (selectedColors.length === 0) {
      setActiveTab('dados')
      toast.error('Selecione ao menos uma cor')
      return
    }

    setIsSaving(true)
    try {
      const productId = isEditing
        ? product.id
        : await (async () => {
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
            return created.id
          })()

      if (isEditing) {
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: data.name,
            category_slug: data.categorySlug,
            description: data.description ?? '',
            price_per_meter: data.pricePerMeter,
            width_m: data.widthM,
            stock_meters: data.stockMeters,
            // status de inativo é controlado só pelo toggle Ativar/Inativar da tabela —
            // editar outros campos nunca deve reativar um produto inativado de propósito.
            status:
              product.status === 'draft'
                ? 'draft'
                : data.stockMeters > 0
                  ? 'active'
                  : 'out_of_stock',
            tag: tag === 'none' ? null : tag,
            is_bestseller: isBestseller,
          })
          .eq('id', productId)
        if (productError) throw new Error(productError.message)

        const { error: deleteCompositionsError } = await supabase
          .from('product_compositions')
          .delete()
          .eq('product_id', productId)
        if (deleteCompositionsError) throw new Error(deleteCompositionsError.message)

        const { error: deleteColorsError } = await supabase
          .from('product_colors')
          .delete()
          .eq('product_id', productId)
        if (deleteColorsError) throw new Error(deleteColorsError.message)
      }

      const { error: compositionsError } = await supabase.from('product_compositions').insert(
        compositionIds.map((compositionId) => ({
          product_id: productId,
          composition_id: compositionId,
          percentage: compositionPct[compositionId],
        })),
      )
      if (compositionsError) throw new Error(compositionsError.message)

      const { error: colorsError } = await supabase.from('product_colors').insert(
        selectedColors.map((hex, index) => ({
          product_id: productId,
          label: `Cor ${index + 1}`,
          hex,
        })),
      )
      if (colorsError) throw new Error(colorsError.message)

      for (let index = 0; index < pendingImages.length; index += 1) {
        await uploadProductImage(productId, pendingImages[index], index)
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(isEditing ? `${data.name} atualizado` : `${data.name} cadastrado`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o produto')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-[640px] flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? 'Editar produto' : 'Novo produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="w-full max-w-full justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="composicao">
                Composição
                {compositionTotal !== 100 && (
                  <span className="ml-1 text-[#a3660a]">({compositionTotal}%)</span>
                )}
              </TabsTrigger>
              {!isEditing && <TabsTrigger value="imagens">Imagens</TabsTrigger>}
            </TabsList>

            <TabsContent value="dados" className="flex flex-col gap-4 pt-4">
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
                {errors.categorySlug && (
                  <p className="text-destructive text-xs">{errors.categorySlug.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="widthM">Largura (m)</Label>
                  <Input id="widthM" placeholder="1,40" {...register('widthM')} />
                  {errors.widthM && <p className="text-destructive text-xs">{errors.widthM.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pricePerMeter">Preço/m (R$)</Label>
                  <Input id="pricePerMeter" placeholder="0,00" {...register('pricePerMeter')} />
                  {errors.pricePerMeter && (
                    <p className="text-destructive text-xs">{errors.pricePerMeter.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="stockMeters">Estoque (m)</Label>
                  <Input id="stockMeters" placeholder="0" {...register('stockMeters')} />
                  {errors.stockMeters && (
                    <p className="text-destructive text-xs">{errors.stockMeters.message}</p>
                  )}
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
                        selectedColors.includes(hex)
                          ? 'ring-navy ring-2 ring-offset-2'
                          : 'ring-1 ring-[#d8d0c0]',
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Composição, toque, indicações de uso…"
                  rows={3}
                  {...register('description')}
                />
              </div>
            </TabsContent>

            <TabsContent value="composicao" className="flex flex-col gap-3 pt-4">
              <div className="flex items-baseline justify-between">
                <Label>Composição do tecido</Label>
                <span
                  className={cn(
                    'text-[11.5px]',
                    compositionTotal === 100 ? 'text-[#1e7a44]' : 'text-[#a3660a]',
                  )}
                >
                  Total: {compositionTotal}%
                </span>
              </div>

              <Tabs
                value={compositionSubTab}
                onValueChange={(value) => setCompositionSubTab(value as typeof compositionSubTab)}
              >
                <TabsList>
                  <TabsTrigger value="selecionar">Selecionar</TabsTrigger>
                  <TabsTrigger value="nova">+ Nova composição</TabsTrigger>
                </TabsList>

                <TabsContent value="selecionar" className="pt-3">
                  <div className="flex flex-col gap-2 rounded-md border border-[#ede8de] p-3">
                    {compositions.length === 0 && (
                      <p className="text-text-meta text-xs">
                        Nenhuma composição cadastrada ainda — crie uma na aba "+ Nova composição".
                      </p>
                    )}
                    {compositions.map((composition) => {
                      const checked = composition.id in compositionPct
                      return (
                        <div key={composition.id} className="flex flex-wrap items-center gap-2.5">
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
                </TabsContent>

                <TabsContent value="nova" className="flex flex-col gap-2 pt-3">
                  <Label htmlFor="newComposition">Nome da nova composição</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newComposition"
                      placeholder="Ex: Viscose"
                      value={newCompositionName}
                      onChange={(event) => setNewCompositionName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleCreateComposition()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateComposition}
                      disabled={isCreatingComposition || !newCompositionName.trim()}
                    >
                      {isCreatingComposition ? 'Criando…' : 'Adicionar'}
                    </Button>
                  </div>
                  <p className="text-text-meta text-xs">
                    Fica disponível pra todos os produtos assim que criada — depois de salvar, volte pra
                    "Selecionar" pra marcar o percentual.
                  </p>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {!isEditing && (
              <TabsContent value="imagens" className="flex flex-col gap-2 pt-4">
                <div className="flex items-baseline justify-between">
                  <Label>Imagens do produto</Label>
                  <span className="text-text-meta text-[11.5px]">
                    {pendingImages.length}/{MAX_PRODUCT_IMAGES}
                  </span>
                </div>
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
                  {pendingImages.length < MAX_PRODUCT_IMAGES && (
                    <label className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-[#d8d0c0] text-[11px] text-[#a39a8c]">
                      + Adicionar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const selected = Array.from(event.target.files ?? [])
                          event.target.value = ''
                          const { accepted, rejectedCount } = limitProductImageSelection(
                            pendingImages.length,
                            selected,
                          )
                          if (rejectedCount > 0) {
                            toast.error(`Limite de ${MAX_PRODUCT_IMAGES} imagens por produto`)
                          }
                          setPendingImages((current) => [...current, ...accepted])
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-text-meta text-xs">
                  Pra gerenciar imagens depois de criado, use o botão "Imagens" na tabela.
                </p>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="border-t border-[#ede8de] pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
