import { buildCSV } from '@/lib/csv'
import { STATUS_LABELS } from './data'
import type { Composition, Product, ProductComposition, ProductStatus } from './types'

function dominantComposition(compositions: ProductComposition[]): ProductComposition {
  return [...compositions].sort((a, b) => b.percentage - a.percentage)[0]
}

function compositionName(compositionId: string, allCompositions: Composition[]): string {
  return (
    allCompositions.find((composition) => composition.id === compositionId)?.name ?? compositionId
  )
}

export function formatCompositionLabel(
  compositions: ProductComposition[],
  allCompositions: Composition[],
): string {
  return compositionName(dominantComposition(compositions).compositionId, allCompositions)
}

export function formatCompositionBreakdown(
  compositions: ProductComposition[],
  allCompositions: Composition[],
): string {
  return compositions
    .map(
      ({ compositionId, percentage }) =>
        `${percentage}% ${compositionName(compositionId, allCompositions)}`,
    )
    .join(' / ')
}

export function formatWidthM(widthM: number): string {
  if (widthM < 0.1) return `${Math.round(widthM * 1000)}mm`
  if (widthM < 1) return `${Math.round(widthM * 100)}cm`
  return `${widthM.toFixed(2).replace('.', ',')}m`
}

/**
 * Recalcula o status "de estoque" (active/low_stock/out_of_stock) a partir da
 * quantidade atual — nunca mexe em `draft`, que só o toggle Ativar/Inativar
 * controla (ver ADR-007). minStockMeters = 0 significa "sem limiar definido",
 * nesse caso nunca vira low_stock (rollout seguro pra produtos sem mínimo
 * configurado ainda).
 */
export function computeStockStatus(
  currentStatus: ProductStatus,
  stockMeters: number,
  minStockMeters: number,
): ProductStatus {
  if (currentStatus === 'draft') return 'draft'
  if (stockMeters <= 0) return 'out_of_stock'
  if (minStockMeters > 0 && stockMeters <= minStockMeters) return 'low_stock'
  return 'active'
}

export function buildStockCSV(products: Product[], compositions: Composition[]): string {
  return buildCSV(
    ['Produto', 'SKU', 'Composição', 'Estoque (m)', 'Estoque mínimo (m)', 'Status'],
    products.map((product) => [
      product.name,
      product.sku,
      product.compositions.length > 0
        ? formatCompositionLabel(product.compositions, compositions)
        : '',
      String(product.stockMeters),
      String(product.minStockMeters),
      STATUS_LABELS[product.status],
    ]),
  )
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
