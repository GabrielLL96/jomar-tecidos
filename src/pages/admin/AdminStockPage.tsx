import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { toDateOnly } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import { useAdminProducts, useCompositions } from '@/features/catalog/hooks'
import { useStockMovements } from '@/features/stock/hooks'
import { STATUS_LABELS, STATUS_STYLES } from '@/features/catalog/data'
import { buildStockCSV, computeStockStatus, formatCompositionLabel } from '@/features/catalog/utils'
import type { Product } from '@/features/catalog/types'

const ALL_COMPOSITIONS = 'all'
const ALL_STATUSES = 'all'
const NEEDS_RESTOCK = 'needs_restock'
type StatusFilter =
  typeof ALL_STATUSES | typeof NEEDS_RESTOCK | 'low_stock' | 'out_of_stock' | 'active'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AdminStockPage() {
  const { user } = useAuth()
  const { data: products = [], isLoading } = useAdminProducts()
  const { data: compositions = [] } = useCompositions()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES)
  const [compositionFilter, setCompositionFilter] = useState(ALL_COMPOSITIONS)

  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida'>('entrada')
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const { data: movements = [], isLoading: isLoadingHistory } = useStockMovements(
    historyProduct?.id ?? '',
    !!historyProduct,
  )

  const needsRestockCount = useMemo(
    () => products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock').length,
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      if (query) {
        const matches =
          product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
        if (!matches) return false
      }
      if (statusFilter === NEEDS_RESTOCK) {
        if (product.status !== 'low_stock' && product.status !== 'out_of_stock') return false
      } else if (statusFilter !== ALL_STATUSES && product.status !== statusFilter) {
        return false
      }
      if (
        compositionFilter !== ALL_COMPOSITIONS &&
        !product.compositions.some((c) => c.compositionId === compositionFilter)
      ) {
        return false
      }
      return true
    })
  }, [products, search, statusFilter, compositionFilter])

  const openAdjust = (product: Product) => {
    setAdjustingProduct(product)
    setAdjustType('entrada')
    setAdjustQuantity('')
    setAdjustReason('')
  }

  const handleAdjustSubmit = async () => {
    if (!adjustingProduct) return
    const quantity = Number(adjustQuantity.replace(',', '.'))
    if (!quantity || quantity <= 0) {
      toast.error('Informe uma quantidade válida')
      return
    }
    if (!adjustReason.trim()) {
      toast.error('Informe o motivo do ajuste')
      return
    }
    const delta = adjustType === 'entrada' ? quantity : -quantity
    const newStock = adjustingProduct.stockMeters + delta
    if (newStock < 0) {
      toast.error('Estoque não pode ficar negativo')
      return
    }

    setIsAdjusting(true)
    try {
      const newStatus = computeStockStatus(
        adjustingProduct.status,
        newStock,
        adjustingProduct.minStockMeters,
      )
      const { error: productError } = await supabase
        .from('products')
        .update({ stock_meters: newStock, status: newStatus })
        .eq('id', adjustingProduct.id)
      if (productError) throw new Error(productError.message)

      const { error: movementError } = await supabase.from('stock_movements').insert({
        product_id: adjustingProduct.id,
        quantity: delta,
        reason: adjustReason.trim(),
        user_id: user?.id ?? null,
        performed_by_name: user?.name ?? 'Desconhecido',
      })
      if (movementError) throw new Error(movementError.message)

      toast.success('Estoque atualizado')
      const productId = adjustingProduct.id
      setAdjustingProduct(null)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['stock-movements', productId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ajustar o estoque')
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleMinStockCommit = async (product: Product, rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Estoque mínimo inválido')
      return
    }
    if (parsed === product.minStockMeters) return

    const newStatus = computeStockStatus(product.status, product.stockMeters, parsed)
    const { error } = await supabase
      .from('products')
      .update({ min_stock_meters: parsed, status: newStatus })
      .eq('id', product.id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  return (
    <div>
      {needsRestockCount > 0 && (
        <button
          type="button"
          onClick={() =>
            setStatusFilter((current) => (current === NEEDS_RESTOCK ? ALL_STATUSES : NEEDS_RESTOCK))
          }
          className="mb-[18px] flex w-full items-center gap-2.5 rounded-md border border-[#f0c9a8] bg-[#fbeed4] px-4 py-3 text-left text-[13px] text-[#8c5a0a]"
        >
          <AlertTriangle className="size-4 shrink-0" />
          {needsRestockCount} {needsRestockCount === 1 ? 'item precisa' : 'itens precisam'} de
          reposição
        </button>
      )}

      <div className="mb-[18px] flex flex-col gap-2.5 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            placeholder="Buscar por nome ou SKU…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white sm:w-[240px]"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full bg-white sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Todos status</SelectItem>
              <SelectItem value={NEEDS_RESTOCK}>Precisa de reposição</SelectItem>
              <SelectItem value="active">Normal</SelectItem>
              <SelectItem value="low_stock">Baixo</SelectItem>
              <SelectItem value="out_of_stock">Esgotado</SelectItem>
            </SelectContent>
          </Select>
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
        <Button
          variant="outline"
          onClick={() =>
            downloadCSV(buildStockCSV(filteredProducts, compositions), `estoque-${toDateOnly(new Date())}.csv`)
          }
          className="sm:self-start"
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border border-[#e4ddd0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Composição</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Carregando…</TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-text-meta text-sm">
                    Nenhum produto encontrado para os filtros aplicados.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter(ALL_STATUSES)
                      setCompositionFilter(ALL_COMPOSITIONS)
                    }}
                  >
                    Limpar filtros
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-text-meta text-[11.5px]">{product.sku}</div>
                  </TableCell>
                  <TableCell>
                    {product.compositions.length > 0
                      ? formatCompositionLabel(product.compositions, compositions)
                      : '—'}
                  </TableCell>
                  <TableCell>{product.stockMeters} m</TableCell>
                  <TableCell>
                    <Input
                      key={`${product.id}-${product.minStockMeters}`}
                      type="number"
                      min={0}
                      defaultValue={product.minStockMeters}
                      onBlur={(event) => handleMinStockCommit(product, event.target.value)}
                      className="w-[80px]"
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        STATUS_STYLES[product.status],
                      )}
                    >
                      {STATUS_LABELS[product.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openAdjust(product)}>
                        Ajustar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryProduct(product)}
                      >
                        Histórico
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar estoque — {adjustingProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustType === 'entrada' ? 'default' : 'outline'}
                  onClick={() => setAdjustType('entrada')}
                  className="flex-1"
                >
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'saida' ? 'default' : 'outline'}
                  onClick={() => setAdjustType('saida')}
                  className="flex-1"
                >
                  Saída
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="adjustQuantity">Quantidade (metros)</Label>
              <Input
                id="adjustQuantity"
                placeholder="0"
                value={adjustQuantity}
                onChange={(event) => setAdjustQuantity(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="adjustReason">Motivo</Label>
              <Input
                id="adjustReason"
                placeholder="Ex: reposição de fornecedor, correção de contagem…"
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustingProduct(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustSubmit} disabled={isAdjusting}>
              {isAdjusting ? 'Salvando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyProduct} onOpenChange={(open) => !open && setHistoryProduct(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {historyProduct?.name}</DialogTitle>
          </DialogHeader>
          {isLoadingHistory ? (
            <p className="text-text-meta text-sm">Carregando…</p>
          ) : movements.length === 0 ? (
            <p className="text-text-meta text-sm">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {movements.map((movement) => (
                <li key={movement.id} className="border-b border-[#ede8de] pb-3 last:border-0">
                  <div className="flex items-baseline justify-between">
                    <span
                      className={cn(
                        'text-[14px] font-semibold',
                        movement.quantity > 0 ? 'text-[#1e7a44]' : 'text-[#b0362b]',
                      )}
                    >
                      {movement.quantity > 0 ? '+' : ''}
                      {movement.quantity} m
                    </span>
                    <span className="text-text-meta text-[11.5px]">
                      {dateTimeFormatter.format(new Date(movement.createdAt))}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#3a352b]">{movement.reason}</p>
                  <p className="text-text-meta mt-0.5 text-[11.5px]">{movement.performedByName}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
