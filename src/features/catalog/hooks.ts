import { useQuery } from '@tanstack/react-query'
import {
  adminProductsQueryOptions,
  categoriesQueryOptions,
  compositionsQueryOptions,
  productQueryOptions,
  productReviewsQueryOptions,
  productsQueryOptions,
} from './queries'

export const useCategories = () => useQuery(categoriesQueryOptions)
export const useCompositions = () => useQuery(compositionsQueryOptions)
export const useProducts = () => useQuery(productsQueryOptions)
export const useAdminProducts = () => useQuery(adminProductsQueryOptions)
export const useProduct = (slug: string) => useQuery(productQueryOptions(slug))
export const useProductReviews = (productId: string) => useQuery(productReviewsQueryOptions(productId))
