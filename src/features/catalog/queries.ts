import { queryOptions } from '@tanstack/react-query'
import { CATEGORY_DISPLAY, COMPOSITIONS, PRODUCTS, REVIEWS } from './data'
import type { CategoryCard } from './types'

const MOCK_DELAY_MS = 300

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS))
}

const VISIBLE_PRODUCTS = PRODUCTS.filter((product) => product.status !== 'draft')

function buildCategoryCards(): CategoryCard[] {
  return Object.entries(CATEGORY_DISPLAY).map(([id, display]) => {
    const composition = COMPOSITIONS.find((item) => item.id === id)
    const count = VISIBLE_PRODUCTS.filter((product) => product.categorySlug === id).length
    return { id, name: composition?.name ?? id, count, ...display }
  })
}

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'] as const,
  queryFn: () => delay(buildCategoryCards()),
  staleTime: Infinity,
})

export const productsQueryOptions = queryOptions({
  queryKey: ['products'] as const,
  queryFn: () => delay(VISIBLE_PRODUCTS),
  staleTime: Infinity,
})

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['products', slug] as const,
    queryFn: () => delay(VISIBLE_PRODUCTS.find((product) => product.slug === slug) ?? null),
    staleTime: Infinity,
  })

export const productReviewsQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: ['products', productId, 'reviews'] as const,
    queryFn: () => delay(REVIEWS.filter((review) => review.productId === productId)),
    staleTime: Infinity,
  })
