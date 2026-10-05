import type { UserRole } from './types'
import { isStaffRole } from './mfa'

export const MFA_PATH = '/conta/mfa'

// Destino padrão pós-autenticação completa (login + MFA quando staff) — admin
// vai pro painel, não pra área de cliente.
export function defaultRedirectFor(role: UserRole) {
  return role === 'admin' ? '/admin' : '/conta'
}

// Logo após o login. Admin vai direto pro /admin: o guard do painel só manda
// pro desafio quem tem MFA ativo — passar pelo /conta/mfa sem precisar fazia
// a tela piscar antes de seguir. Demais roles de staff (sem painel próprio)
// passam pelo /conta/mfa. Um `?redirect=` explícito sempre vence (um admin
// tentando comprar como cliente não deve ser forçado pro painel nem pro MFA).
export function postLoginRedirectFor(role: UserRole, redirectParam: string | null) {
  if (redirectParam) return redirectParam
  if (role === 'admin') return defaultRedirectFor(role)
  return isStaffRole(role) ? MFA_PATH : defaultRedirectFor(role)
}

export function mfaPathWithRedirect(redirectTo: string) {
  return `${MFA_PATH}?redirect=${encodeURIComponent(redirectTo)}`
}
