import type { UserRole } from './types'
import { isStaffRole } from './mfa'

export const MFA_PATH = '/conta/mfa'

// Destino padrão pós-autenticação completa (login + MFA quando staff) — admin
// vai pro painel, não pra área de cliente.
export function defaultRedirectFor(role: UserRole) {
  return role === 'admin' ? '/admin' : '/conta'
}

// Logo após o login: staff passa pelo /conta/mfa, que pede o código se o MFA
// estiver ativo e segue direto pro destino se não estiver. Um `?redirect=`
// explícito sempre vence (um admin tentando comprar como cliente não deve ser
// forçado pro painel nem pro MFA; se o /admin for aberto depois, o guard do
// painel manda pro desafio).
export function postLoginRedirectFor(role: UserRole, redirectParam: string | null) {
  if (redirectParam) return redirectParam
  return isStaffRole(role) ? MFA_PATH : defaultRedirectFor(role)
}

export function mfaPathWithRedirect(redirectTo: string) {
  return `${MFA_PATH}?redirect=${encodeURIComponent(redirectTo)}`
}
