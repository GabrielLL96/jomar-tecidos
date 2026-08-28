import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Address } from '@/features/account/types'
import type { AdminUser, AdminUserOrderSummary } from './types'

const ADMIN_USER_SELECT = 'id, name, email, phone, cpf, role, status, last_login_at, created_at'

function mapAdminUser(row: {
  id: string
  name: string
  email: string
  phone: string | null
  cpf: string | null
  role: AdminUser['role']
  status: AdminUser['status']
  last_login_at: string | null
  created_at: string
}): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf,
    role: row.role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }
}

export const adminUsersQueryOptions = queryOptions({
  queryKey: ['admin-users'] as const,
  queryFn: async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase
      .from('users')
      .select(ADMIN_USER_SELECT)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data.map(mapAdminUser)
  },
})

export const adminUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin-users', userId] as const,
    queryFn: async (): Promise<AdminUser | null> => {
      const { data, error } = await supabase
        .from('users')
        .select(ADMIN_USER_SELECT)
        .eq('id', userId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ? mapAdminUser(data) : null
    },
  })

export const adminUserOrdersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin-users', userId, 'orders'] as const,
    queryFn: async (): Promise<AdminUserOrderSummary[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        total: row.total,
        createdAt: row.created_at,
      }))
    },
  })

export const userAddressesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin-users', userId, 'addresses'] as const,
    queryFn: async (): Promise<Address[]> => {
      const { data, error } = await supabase
        .from('addresses')
        .select('id, label, street, city, state, zip_code, is_default')
        .eq('user_id', userId)
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        label: row.label,
        street: row.street,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        isDefault: row.is_default,
      }))
    },
  })
