import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { formatPriceBRL } from '@/lib/format'
import { useCompositions, useProducts } from '@/features/catalog/hooks'
import { formatCompositionLabel } from '@/features/catalog/utils'
import type { ProductStatus } from '@/features/catalog/types'
import { AdminProductModal } from './AdminProductModal'

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
  const { data: products = [], isLoading } = useProducts()
  const { data: compositions = [] } = useCompositions()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => product.name.toLowerCase().includes(query))
  }, [products, search])

  return (
    <div>
      <div className="mb-[18px] flex justify-between gap-2.5">
        <Input
          placeholder="Buscar produto…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-[260px]"
        />
        <Button onClick={() => setModalOpen(true)}>+ Novo produto</Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <ImagePlaceholder colors={product.colors} className="size-10 rounded-sm" />
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminProductModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
