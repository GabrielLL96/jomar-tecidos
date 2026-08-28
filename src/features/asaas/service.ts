import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'
import type { ChargeCardInput, ChargeCardResult, CreateChargeResult, SavedCard } from './types'
import type { PaymentMethod } from '@/features/orders/types'

export async function validateAsaasConnection(): Promise<void> {
  const { error } = await supabase.functions.invoke('asaas-validate-connection')
  if (error) await unwrapFunctionError(error)
}

export async function createAsaasCharge(
  orderId: string,
  paymentMethod: PaymentMethod,
  installments?: number,
): Promise<CreateChargeResult> {
  const { data, error } = await supabase.functions.invoke<CreateChargeResult>(
    'asaas-create-charge',
    {
      body: { orderId, paymentMethod, installments },
    },
  )
  if (error) await unwrapFunctionError(error)
  if (!data) throw new Error('Resposta vazia ao criar cobrança')
  return data
}

export async function refundAsaasOrder(
  orderId: string,
  reason: string,
  amount?: number,
): Promise<void> {
  const { error } = await supabase.functions.invoke('asaas-refund', {
    body: { orderId, reason, amount },
  })
  if (error) await unwrapFunctionError(error)
}

// Cartão cru só existe na memória deste request — vai direto no body da
// invocação, nunca gravado em nenhum estado persistido do frontend.
export async function chargeAsaasCard(input: ChargeCardInput): Promise<ChargeCardResult> {
  const { data, error } = await supabase.functions.invoke<ChargeCardResult>('asaas-charge-card', {
    body: input,
  })
  if (error) await unwrapFunctionError(error)
  if (!data) throw new Error('Resposta vazia ao cobrar cartão')
  return data
}

export async function chargeAsaasWithSavedCard(
  orderId: string,
  savedCardId: string,
  installments?: number,
): Promise<ChargeCardResult> {
  const { data, error } = await supabase.functions.invoke<ChargeCardResult>(
    'asaas-charge-with-token',
    {
      body: { orderId, savedCardId, installments },
    },
  )
  if (error) await unwrapFunctionError(error)
  if (!data) throw new Error('Resposta vazia ao cobrar cartão salvo')
  return data
}

export async function fetchSavedCards(): Promise<SavedCard[]> {
  const { data, error } = await supabase
    .from('saved_credit_cards')
    .select('id, last_four_digits, brand, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    lastFourDigits: row.last_four_digits,
    brand: row.brand,
    createdAt: row.created_at,
  }))
}
