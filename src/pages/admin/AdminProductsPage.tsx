import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { cn } from '@/lib/utils'
import { formatPriceBRL } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAdminProducts, useCompositions } from '@/features/catalog/hooks'
import { STATUS_LABELS, STATUS_STYLES } from '@/features/catalog/data'
import { computeStockStatus, formatCompositionLabel, slugify } from '@/features/catalog/utils'
import type { Product } from '@/features/catalog/types'
import { AdminProductModal } from './AdminProductModal'
import { ProductImagesModal } from './ProductImagesModal'

const ALL_COMPOSITIONS = 'all'
type SortKey = 'name' | 'price' | 'stock' | 'status'
type SortDirection = 'asc' | 'desc'

export function AdminProductsPage() {
  const { data: products = [], isLoading } = useAdminProducts()
  const { data: compositions = [] } = useCompositions()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [compositionFilter, setCompositionFilter] = useState(ALL_COMPOSITIONS)
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [imagesModalProduct, setImagesModalProduct] = useState<Product | null>(null)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)

  const hasActiveFilters = search.trim().length > 0 || compositionFilter !== ALL_COMPOSITIONS

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    let result = products
    if (query) result = result.filter((product) => product.name.toLowerCase().includes(query))
    if (compositionFilter !== ALL_COMPOSITIONS) {
      // "vinculada" inclui qualquer percentual, não só quando é o material predominante.
      result = result.filter((product) =>
        product.compositions.some((c) => c.compositionId === compositionFilter),
      )
    }
    if (!sort) return result

    const direction = sort.direction === 'asc' ? 1 : -1
    return [...result].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return a.name.localeCompare(b.name, 'pt-BR') * direction
        case 'price':
          return (a.pricePerMeter - b.pricePerMeter) * direction
        case 'stock':
          return (a.stockMeters - b.stockMeters) * direction
        case 'status':
          return STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status], 'pt-BR') * direction
      }
    })
  }, [products, search, compositionFilter, sort])

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const clearFilters = () => {
    setSearch('')
    setCompositionFilter(ALL_COMPOSITIONS)
  }

  const toggleNew = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ tag: product.tag === 'Novo' ? null : 'Novo' })
      .eq('id', product.id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const toggleBestseller = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_bestseller: !product.isBestseller })
      .eq('id', product.id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const toggleActive = async (product: Product) => {
    const isInactive = product.status === 'draft'
    const nextStatus = isInactive
      ? computeStockStatus('active', product.stockMeters, product.minStockMeters)
      : 'draft'
    const { error } = await supabase
      .from('products')
      .update({ status: nextStatus })
      .eq('id', product.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isInactive ? `${product.name} reativado` : `${product.name} inativado`)
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const duplicateProduct = async (product: Product) => {
    setIsDuplicating(product.id)
    try {
      const { data: created, error: productError } = await supabase
        .from('products')
        .insert({
          sku: `ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          slug: `${slugify(product.name)}-copia-${crypto.randomUUID().slice(0, 4)}`,
          name: `${product.name} (cópia)`,
          category_slug: product.categorySlug,
          description: product.description,
          price_per_meter: product.pricePerMeter,
          width_m: product.widthM,
          stock_meters: product.stockMeters,
          min_sale_meters: product.minSaleMeters,
          // nasce inativo de propósito — cópia não deve aparecer na loja com o
          // mesmo nome do original até o admin revisar/renomear e ativar.
          status: 'draft',
          tag: null,
          is_bestseller: false,
        })
        .select('id')
        .single()
      if (productError) throw new Error(productError.message)

      if (product.compositions.length > 0) {
        const { error: compositionsError } = await supabase.from('product_compositions').insert(
          product.compositions.map((c) => ({
            product_id: created.id,
            composition_id: c.compositionId,
            percentage: c.percentage,
          })),
        )
        if (compositionsError) throw new Error(compositionsError.message)
      }

      if (product.colorOptions.length > 0) {
        const { error: colorsError } = await supabase.from('product_colors').insert(
          product.colorOptions.map((c) => ({
            product_id: created.id,
            label: c.label,
            hex: c.hex,
          })),
        )
        if (colorsError) throw new Error(colorsError.message)
      }

      // imagens não são duplicadas de propósito — evita copiar arquivos no Storage
      // sem necessidade; admin sobe as imagens certas pro produto novo.
      toast.success(`"${product.name}" duplicado como rascunho`)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível duplicar o produto')
    } finally {
      setIsDuplicating(null)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const sortIcon = (key: SortKey) => {
    if (sort?.key !== key) return <ArrowUpDown className="size-3.5 text-[#a39a8c]" />
    return sort.direction === 'asc' ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    )
  }

  const sortableHead = (key: SortKey, label: string) => (
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn('flex items-center gap-1 font-medium', sort?.key === key && 'text-navy-dark')}
      >
        {label}
        {sortIcon(key)}
      </button>
    </TableHead>
  )

  return (
    <div>
      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            placeholder="Buscar produto…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white sm:w-[260px]"
          />
          <Select value={compositionFilter} onValueChange={setCompositionFilter}>
            <SelectTrigger className="w-full bg-white sm:w-[200px]">
              <SelectValue placeholder="Todas composições" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COMPOSITIONS}>Todas composições</SelectItem>
              {compositions.map((composition) => (
                <SelectItem key={composition.id} value={composition.id}>
                  {composition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateModal} className="sm:self-start">
          + Novo produto
        </Button>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              {sortableHead('name', 'Produto')}
              <TableHead>Composição</TableHead>
              {sortableHead('price', 'Preço/m')}
              {sortableHead('stock', 'Estoque')}
              {sortableHead('status', 'Status')}
              <TableHead>Novo</TableHead>
              <TableHead>Mais vendido</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>Carregando…</TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    {hasActiveFilters
                      ? 'Nenhum produto encontrado para os filtros aplicados.'
                      : 'Nenhum produto cadastrado ainda.'}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isInactive = product.status === 'draft'
                return (
                  <TableRow key={product.id} className={isInactive ? 'opacity-60' : undefined}>
                    <TableCell>
                      <ImagePlaceholder
                        colors={product.colors}
                        src={product.images[0]?.url}
                        alt={product.name}
                        className="size-10 rounded-sm"
                      />
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {formatCompositionLabel(product.compositions, compositions)}
                    </TableCell>
                    <TableCell>{formatPriceBRL(product.pricePerMeter)}</TableCell>
                    <TableCell>{product.stockMeters} m</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[product.status]}`}
                      >
                        {STATUS_LABELS[product.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={product.tag === 'Novo'}
                        onChange={() => toggleNew(product)}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={product.isBestseller}
                        onChange={() => toggleBestseller(product)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(product)}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImagesModalProduct(product)}
                        >
                          Imagens
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateProduct(product)}
                          disabled={isDuplicating === product.id}
                        >
                          {isDuplicating === product.id ? 'Duplicando…' : 'Duplicar'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(product)}>
                          {isInactive ? 'Ativar' : 'Inativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AdminProductModal
        open={modalOpen}
        onOpenChange={(nextOpen) => {
          setModalOpen(nextOpen)
          if (!nextOpen) setEditingProduct(null)
        }}
        product={editingProduct}
      />
      <ProductImagesModal
        product={imagesModalProduct}
        onOpenChange={(open) => !open && setImagesModalProduct(null)}
      />
    </div>
  )
}
