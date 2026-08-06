export interface Composition {
  id: string
  name: string
  color: string | null
}

export interface ProductComposition {
  compositionId: string
  percentage: number
}

export interface ColorOption {
  id: string
  label: string
  hex: string
}

export interface ProductImage {
  id: string
  url: string
  sortOrder: number
}

export type ProductStatus = 'active' | 'low_stock' | 'out_of_stock' | 'draft'

export interface Product {
  id: string
  sku: string
  slug: string
  name: string
  categorySlug: string
  compositions: ProductComposition[]
  pricePerMeter: number
  widthM: number
  stockMeters: number
  minSaleMeters: number
  minStockMeters: number
  status: ProductStatus
  tag?: 'Novo' | 'Premium'
  isBestseller: boolean
  colors: [string, string]
  description: string
  colorOptions: ColorOption[]
  images: ProductImage[]
}

export interface CategoryCard {
  id: string
  name: string
  tag: string
  colors: [string, string]
  imageUrl?: string
  count: number
}

export interface Review {
  id: string
  productId: string
  authorName: string
  rating: 1 | 2 | 3 | 4 | 5
  text: string
  createdAt: string
}
