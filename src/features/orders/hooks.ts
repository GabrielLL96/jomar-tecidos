import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  adminCouponsQueryOptions,
  adminDeliveriesPageQueryOptions,
  adminOrdersPageQueryOptions,
  adminOrdersQueryOptions,
  adminOrdersSinceQueryOptions,
  myOrdersQueryOptions,
  orderQueryOptions,
} from './queries'

export const useAdminOrders = () => useQuery(adminOrdersQueryOptions)
// keepPreviousData -- troca de página não pisca "Carregando..." por cima da
// tabela cheia, mantém a página anterior visível até a nova chegar.
export const useAdminOrdersPage = (page: number) =>
  useQuery({ ...adminOrdersPageQueryOptions(page), placeholderData: keepPreviousData })
export const useAdminOrdersSince = (sinceIso: string) =>
  useQuery(adminOrdersSinceQueryOptions(sinceIso))
export const useAdminDeliveriesPage = (page: number) =>
  useQuery({ ...adminDeliveriesPageQueryOptions(page), placeholderData: keepPreviousData })
export const useAdminCoupons = () => useQuery(adminCouponsQueryOptions)
export const useMyOrders = (userId: string | undefined) =>
  useQuery(myOrdersQueryOptions(userId ?? ''))
export const useOrder = (id: string | undefined) => useQuery(orderQueryOptions(id ?? ''))
