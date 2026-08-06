import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StockMovement } from './types'

export const stockMovementsQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: ['stock-movements', productId] as const,
    queryFn: async (): Promise<StockMovement[]> => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, product_id, quantity, reason, performed_by_name, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        productId: row.product_id,
        quantity: Number(row.quantity),
        reason: row.reason,
        performedByName: row.performed_by_name,
        createdAt: row.created_at,
      }))
    },
  })
