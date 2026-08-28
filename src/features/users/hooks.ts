import { useQuery } from '@tanstack/react-query'
import {
  adminUserOrdersQueryOptions,
  adminUserQueryOptions,
  adminUsersQueryOptions,
  userAddressesQueryOptions,
} from './queries'

export const useAdminUsers = () => useQuery(adminUsersQueryOptions)

export const useAdminUser = (userId: string) => useQuery(adminUserQueryOptions(userId))

export const useUserAddresses = (userId: string, enabled: boolean) =>
  useQuery({ ...userAddressesQueryOptions(userId), enabled })

export const useAdminUserOrders = (userId: string, enabled: boolean) =>
  useQuery({ ...adminUserOrdersQueryOptions(userId), enabled })
