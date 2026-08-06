import { useQuery } from '@tanstack/react-query'
import { stockMovementsQueryOptions } from './queries'

export const useStockMovements = (productId: string, enabled: boolean) =>
  useQuery({ ...stockMovementsQueryOptions(productId), enabled })
