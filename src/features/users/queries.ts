import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Address } from '@/features/account/types'
import type { AdminUser } from './types'

export const adminUsersQueryOptions = queryOptions({
  queryKey: ['admin-users'] as const,
  queryFn: async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, status, last_login_at, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      status: row.status,
      lastLoginAt: row.last_login_at,
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
