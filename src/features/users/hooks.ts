import { useQuery } from '@tanstack/react-query'
import { adminUsersQueryOptions, userAddressesQueryOptions } from './queries'

export const useAdminUsers = () => useQuery(adminUsersQueryOptions)

export const useUserAddresses = (userId: string, enabled: boolean) =>
  useQuery({ ...userAddressesQueryOptions(userId), enabled })
