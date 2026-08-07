import { useQuery } from '@tanstack/react-query'
import { adminOrdersQueryOptions, myOrdersQueryOptions, orderQueryOptions } from './queries'

export const useAdminOrders = () => useQuery(adminOrdersQueryOptions)
export const useMyOrders = (userId: string | undefined) => useQuery(myOrdersQueryOptions(userId ?? ''))
export const useOrder = (id: string | undefined) => useQuery(orderQueryOptions(id ?? ''))
