import { useQuery } from '@tanstack/react-query'
import {
  adminCompositionsQueryOptions,
  adminProductsQueryOptions,
  categoriesQueryOptions,
  compositionsQueryOptions,
  productQueryOptions,
  productReviewsQueryOptions,
  productsQueryOptions,
} from './queries'

export const useCategories = () => useQuery(categoriesQueryOptions)
export const useCompositions = () => useQuery(compositionsQueryOptions)
export const useAdminCompositions = () => useQuery(adminCompositionsQueryOptions)
export const useProducts = () => useQuery(productsQueryOptions)
export const useAdminProducts = () => useQuery(adminProductsQueryOptions)
export const useProduct = (slug: string) => useQuery(productQueryOptions(slug))
export const useProductReviews = (productId: string) => useQuery(productReviewsQueryOptions(productId))
