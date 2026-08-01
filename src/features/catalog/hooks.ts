import { useQuery } from '@tanstack/react-query'
import { categoriesQueryOptions, productQueryOptions, productsQueryOptions } from './queries'

export const useCategories = () => useQuery(categoriesQueryOptions)
export const useProducts = () => useQuery(productsQueryOptions)
export const useProduct = (slug: string) => useQuery(productQueryOptions(slug))
