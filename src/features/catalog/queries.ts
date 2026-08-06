import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CATEGORY_DISPLAY } from './data'
import type { CategoryCard, Composition, Product, Review } from './types'

const PRODUCT_SELECT =
  '*, product_compositions(percentage, compositions(id, name)), product_colors(id, label, hex), product_images(id, url, sort_order)'

const COMPOSITION_ORDER = [
  'Linhos',
  'Algodões',
  'Sedas',
  'Aviamentos',
  'Rendas',
  'Algodão Egípcio',
  'Poliéster',
  'Nylon',
]

type ProductRow = {
  id: string
  sku: string
  slug: string
  name: string
  category_slug: string
  description: string
  price_per_meter: number | string
  width_m: number | string
  stock_meters: number | string
  min_sale_meters: number | string
  status: Product['status']
  tag: string | null
  is_bestseller: boolean
  product_compositions: { percentage: number; compositions: { id: string; name: string } }[]
  product_colors: { id: string; label: string; hex: string }[]
  product_images: { id: string; url: string; sort_order: number }[]
}

function adaptProduct(row: ProductRow): Product {
  const placeholderColors = CATEGORY_DISPLAY[row.category_slug]?.colors ?? ['#e4ddd0', '#d8d0c0']
  const images = [...row.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({ id: image.id, url: image.url, sortOrder: image.sort_order }))
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    categorySlug: row.category_slug,
    compositions: row.product_compositions.map((pc) => ({
      compositionId: pc.compositions.id,
      percentage: pc.percentage,
    })),
    pricePerMeter: Number(row.price_per_meter),
    widthM: Number(row.width_m),
    stockMeters: Number(row.stock_meters),
    minSaleMeters: Number(row.min_sale_meters),
    status: row.status,
    tag: row.tag === 'Novo' || row.tag === 'Premium' ? row.tag : undefined,
    isBestseller: row.is_bestseller,
    colors: placeholderColors,
    description: row.description,
    colorOptions: row.product_colors.map((c) => ({ id: c.id, label: c.label, hex: c.hex })),
    images,
  }
}

export const compositionsQueryOptions = queryOptions({
  queryKey: ['compositions'] as const,
  queryFn: async (): Promise<Composition[]> => {
    const { data, error } = await supabase.from('compositions').select('id, name')
    if (error) throw new Error(error.message)
    return [...data].sort(
      (a, b) => COMPOSITION_ORDER.indexOf(a.name) - COMPOSITION_ORDER.indexOf(b.name),
    )
  },
  staleTime: 5 * 60 * 1000,
})

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'] as const,
  queryFn: async (): Promise<CategoryCard[]> => {
    const { data, error } = await supabase.from('products').select('category_slug').neq('status', 'draft')
    if (error) throw new Error(error.message)

    return Object.entries(CATEGORY_DISPLAY).map(([id, display]) => ({
      id,
      name: display.tag,
      count: data.filter((row) => row.category_slug === id).length,
      ...display,
    }))
  },
  staleTime: 60 * 1000,
})

export const productsQueryOptions = queryOptions({
  queryKey: ['products'] as const,
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .neq('status', 'draft')
    if (error) throw new Error(error.message)
    return data.map((row) => adaptProduct(row as unknown as ProductRow))
  },
  staleTime: 60 * 1000,
})

// Sem o filtro de `draft` — usado só pelo admin, que precisa ver (e reativar)
// produtos inativados. A loja e a Home usam `productsQueryOptions` acima.
export const adminProductsQueryOptions = queryOptions({
  queryKey: ['products', 'admin'] as const,
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT)
    if (error) throw new Error(error.message)
    return data.map((row) => adaptProduct(row as unknown as ProductRow))
  },
  staleTime: 60 * 1000,
})

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['products', slug] as const,
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('slug', slug)
        .neq('status', 'draft')
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ? adaptProduct(data as unknown as ProductRow) : null
    },
    staleTime: 60 * 1000,
    enabled: Boolean(slug),
  })

export const productReviewsQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: ['products', productId, 'reviews'] as const,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, product_id, author_name, rating, text, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        productId: row.product_id,
        authorName: row.author_name,
        rating: row.rating as Review['rating'],
        text: row.text,
        createdAt: row.created_at,
      }))
    },
    staleTime: 60 * 1000,
    enabled: Boolean(productId),
  })
