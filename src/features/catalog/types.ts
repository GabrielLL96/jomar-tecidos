export interface Category {
  slug: string
  name: string
  count: number
  tag: string
  colors: [string, string]
}

export interface ColorOption {
  label: string
  hex: string
}

export interface Product {
  id: number
  slug: string
  name: string
  material: string
  categorySlug: string
  price: number
  tag?: 'Novo' | 'Premium'
  colors: [string, string]
  description: string
  colorOptions: ColorOption[]
  composition: string
}
