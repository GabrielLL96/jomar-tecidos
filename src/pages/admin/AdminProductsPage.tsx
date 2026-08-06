import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { formatPriceBRL } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAdminProducts, useCompositions } from '@/features/catalog/hooks'
import { formatCompositionLabel } from '@/features/catalog/utils'
import type { Product, ProductStatus } from '@/features/catalog/types'
import { AdminProductModal } from './AdminProductModal'
import { ProductImagesModal } from './ProductImagesModal'

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Ativo',
  low_stock: 'Estoque baixo',
  out_of_stock: 'Esgotado',
  draft: 'Rascunho',
}

const STATUS_STYLES: Record<ProductStatus, string> = {
  active: 'bg-[#e2f2e6] text-[#1e7a44]',
  low_stock: 'bg-[#fbeed4] text-[#a3660a]',
  out_of_stock: 'bg-[#fbe2df] text-[#b0362b]',
  draft: 'bg-[#ede8de] text-[#8c8375]',
}

export function AdminProductsPage() {
  const { data: products = [], isLoading } = useAdminProducts()
  const { data: compositions = [] } = useCompositions()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [imagesModalProduct, setImagesModalProduct] = useState<Product | null>(null)

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => product.name.toLowerCase().includes(query))
  }, [products, search])

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
    const nextStatus = isInactive ? (product.stockMeters > 0 ? 'active' : 'out_of_stock') : 'draft'
    const { error } = await supabase.from('products').update({ status: nextStatus }).eq('id', product.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isInactive ? `${product.name} reativado` : `${product.name} inativado`)
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <Input
          placeholder="Buscar produto…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full sm:w-[260px]"
        />
        <Button onClick={openCreateModal} className="sm:self-start">
          + Novo produto
        </Button>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Composição</TableHead>
              <TableHead>Preço/m</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
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
                    <TableCell>{formatCompositionLabel(product.compositions, compositions)}</TableCell>
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
                        <Button variant="outline" size="sm" onClick={() => setImagesModalProduct(product)}>
                          Imagens
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
