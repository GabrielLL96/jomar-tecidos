import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserRole } from './types'

// Espelha public.current_user_role() (migration 20261005120000): MFA é
// opcional pra staff. Sem fator TOTP verificado, sessão aal1 basta; com
// fator, só aal2 exerce o role. Este check no front é só UX (mandar pro
// desafio de MFA) — o enforcement real é no banco.
export function isStaffRole(role: UserRole) {
  return role !== 'customer'
}

// none: nenhum fator TOTP verificado (MFA desligado — acesso liberado)
// challenge: tem fator verificado, mas a sessão atual ainda é aal1
// verified: sessão aal2
export type MfaStep = 'none' | 'challenge' | 'verified'

const AAL2 = 'aal2'

async function fetchMfaStep(): Promise<MfaStep> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw new Error(error.message)
  if (data.currentLevel === AAL2) return 'verified'
  return data.nextLevel === AAL2 ? 'challenge' : 'none'
}

// Só 'challenge' bloqueia: staff com MFA ativo que ainda não digitou o código
// nesta sessão.
export function hasStaffAccess(step: MfaStep) {
  return step !== 'challenge'
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

async function fetchVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  return data.totp[0]?.id ?? null
}

export const totpFactorQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['mfa-totp-factor', userId] as const,
    queryFn: fetchVerifiedTotpFactorId,
    staleTime: 0,
    gcTime: 0,
  })

export async function getVerifiedTotpFactorId(): Promise<string> {
  const factorId = await fetchVerifiedTotpFactorId()
  if (!factorId) throw new Error('Nenhum autenticador cadastrado')
  return factorId
}

// GoTrue exige sessão aal2 pra remover fator verificado — quem só tem a
// senha não consegue desligar o MFA de outra pessoa.
export async function disableTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}

export async function verifyTotpCode(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw new Error('Código inválido ou expirado')
}
