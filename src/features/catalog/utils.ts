import type { Composition, ProductComposition } from './types'

function dominantComposition(compositions: ProductComposition[]): ProductComposition {
  return [...compositions].sort((a, b) => b.percentage - a.percentage)[0]
}

function compositionName(compositionId: string, allCompositions: Composition[]): string {
  return allCompositions.find((composition) => composition.id === compositionId)?.name ?? compositionId
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
    .map(({ compositionId, percentage }) => `${percentage}% ${compositionName(compositionId, allCompositions)}`)
    .join(' / ')
}

export function formatWidthM(widthM: number): string {
  if (widthM < 0.1) return `${Math.round(widthM * 1000)}mm`
  if (widthM < 1) return `${Math.round(widthM * 100)}cm`
  return `${widthM.toFixed(2).replace('.', ',')}m`
}
