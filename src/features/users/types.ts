import type { UserRole } from '@/features/auth/types'

export type UserStatus = 'active' | 'inactive'

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
}
