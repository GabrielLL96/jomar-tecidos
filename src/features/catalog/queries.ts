import { queryOptions } from '@tanstack/react-query'
import { CATEGORIES, PRODUCTS } from './data'

const MOCK_DELAY_MS = 300

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS))
}

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'] as const,
  queryFn: () => delay(CATEGORIES),
  staleTime: Infinity,
})

export const productsQueryOptions = queryOptions({
  queryKey: ['products'] as const,
  queryFn: () => delay(PRODUCTS),
  staleTime: Infinity,
})

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['products', slug] as const,
    queryFn: () => delay(PRODUCTS.find((product) => product.slug === slug) ?? null),
    staleTime: Infinity,
  })
