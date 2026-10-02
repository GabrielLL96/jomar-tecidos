import type { UserRole } from './types'
import { isStaffRole } from './mfa'

export const MFA_PATH = '/conta/mfa'

// Destino padrão pós-autenticação completa (login + MFA quando staff) — admin
// vai pro painel, não pra área de cliente.
export function defaultRedirectFor(role: UserRole) {
  return role === 'admin' ? '/admin' : '/conta'
}

// Logo após o login: staff passa primeiro pelo MFA. Um `?redirect=` explícito
// sempre vence (um admin tentando comprar como cliente não deve ser forçado
// pro painel nem pro MFA — sem aal2 ele age como cliente comum no banco).
export function postLoginRedirectFor(role: UserRole, redirectParam: string | null) {
  if (redirectParam) return redirectParam
  return isStaffRole(role) ? MFA_PATH : defaultRedirectFor(role)
}

export function mfaPathWithRedirect(redirectTo: string) {
  return `${MFA_PATH}?redirect=${encodeURIComponent(redirectTo)}`
}
