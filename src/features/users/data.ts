import type { UserRole } from '@/features/auth/types'
import type { UserStatus } from './types'

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Cliente',
  admin: 'Admin',
  vendas: 'Vendas',
  estoque: 'Estoque',
  marketing: 'Marketing',
  suporte: 'Suporte',
}

export const STAFF_ROLES: UserRole[] = ['admin', 'vendas', 'estoque', 'marketing', 'suporte']

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
}

export const USER_STATUS_STYLES: Record<UserStatus, string> = {
  active: 'bg-[#e2f2e6] text-[#1e7a44]',
  // Cor escurecida em 2026-08-28 (auditoria a11y) -- #8c8375 reprovava
  // WCAG AA (3.06:1) contra o fundo do badge.
  inactive: 'bg-[#ede8de] text-[#706657]',
}
