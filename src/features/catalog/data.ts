import type { ProductStatus } from './types'

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Ativo',
  low_stock: 'Estoque baixo',
  out_of_stock: 'Esgotado',
  draft: 'Rascunho',
}

export const STATUS_STYLES: Record<ProductStatus, string> = {
  active: 'bg-[#e2f2e6] text-[#1e7a44]',
  low_stock: 'bg-[#fbeed4] text-[#a3660a]',
  out_of_stock: 'bg-[#fbe2df] text-[#b0362b]',
  draft: 'bg-[#ede8de] text-[#8c8375]',
}

export const CATEGORY_DISPLAY: Record<string, { tag: string; colors: [string, string] }> = {
  linhos: { tag: 'linho — puro', colors: ['#eee6d6', '#e0d3b6'] },
  algodoes: { tag: 'algodão — liso', colors: ['#e3ecec', '#cfe0e0'] },
  sedas: { tag: 'seda — brilho', colors: ['#efe0e6', '#e0c7d3'] },
  aviamentos: { tag: 'aviamento — misto', colors: ['#e6e4ee', '#d3cfe3'] },
  rendas: { tag: 'renda — guipure', colors: ['#f2efe8', '#e6e0d0'] },
}

export const SWATCH_COLOR_OPTIONS = [
  '#e0d3b6',
  '#cfe0e0',
  '#e0c7d3',
  '#8c9a7c',
  '#4a5a6a',
  '#c13a2e',
  '#1c1a5e',
  '#1a1a1a',
]

export const PRODUCT_CARE_DEFAULT = 'Lavar a frio, não usar alvejante, secar à sombra.'
export const PRODUCT_DELIVERY_DEFAULT =
  'Envio em até 2 dias úteis. Corte sob medida — sem devolução após o corte.'

export const MAX_PRODUCT_IMAGES = 3

/** Corta `incoming` para caber no limite de `MAX_PRODUCT_IMAGES`, considerando `currentCount` já existente. */
export function limitProductImageSelection(currentCount: number, incoming: File[]) {
  const remaining = Math.max(0, MAX_PRODUCT_IMAGES - currentCount)
  return {
    accepted: incoming.slice(0, remaining),
    rejectedCount: Math.max(0, incoming.length - remaining),
  }
}
