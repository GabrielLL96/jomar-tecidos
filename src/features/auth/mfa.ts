import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserRole } from './types'

// Espelha public.current_user_role() (migration 20261002150000): todo role
// diferente de 'customer' só exerce privilégio de staff com sessão aal2.
// Este check no front é só UX (mandar pro cadastro/desafio de MFA) — o
// enforcement real é no banco.
export function isStaffRole(role: UserRole) {
  return role !== 'customer'
}

// enroll: nenhum fator TOTP verificado ainda
// challenge: tem fator verificado, mas a sessão atual ainda é aal1
// verified: sessão aal2
export type MfaStep = 'enroll' | 'challenge' | 'verified'

const AAL2 = 'aal2'

async function fetchMfaStep(): Promise<MfaStep> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw new Error(error.message)
  if (data.currentLevel === AAL2) return 'verified'
  return data.nextLevel === AAL2 ? 'challenge' : 'enroll'
}

// gcTime 0: o nível muda dentro da mesma sessão (verify) e entre sessões do
// mesmo usuário (logout/login volta pra aal1) — nunca servir valor de cache
// de uma montagem anterior.
export const mfaStepQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['mfa-step', userId] as const,
    queryFn: fetchMfaStep,
    staleTime: 0,
    gcTime: 0,
  })

export interface TotpEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

// Cadastro abandonado no meio deixa um fator 'unverified' pendurado; sem
// limpar, cada nova tentativa acumula fator até bater max_enrolled_factors.
async function removeUnverifiedTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  const pending = data.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
  for (const factor of pending) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (unenrollError) throw new Error(unenrollError.message)
  }
}

export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  await removeUnverifiedTotpFactors()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Autenticador ${new Date().toISOString()}`,
  })
  if (error) throw new Error(error.message)
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function getVerifiedTotpFactorId(): Promise<string> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  const [factor] = data.totp
  if (!factor) throw new Error('Nenhum autenticador cadastrado')
  return factor.id
}

export async function verifyTotpCode(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw new Error('Código inválido ou expirado')
}
