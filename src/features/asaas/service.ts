import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'
import type { CreateChargeResult } from './types'
import type { PaymentMethod } from '@/features/orders/types'

export async function validateAsaasConnection(): Promise<void> {
  const { error } = await supabase.functions.invoke('asaas-validate-connection')
  if (error) await unwrapFunctionError(error)
}

export async function createAsaasCharge(
  orderId: string,
  paymentMethod: PaymentMethod,
): Promise<CreateChargeResult> {
  const { data, error } = await supabase.functions.invoke<CreateChargeResult>('asaas-create-charge', {
    body: { orderId, paymentMethod },
  })
  if (error) await unwrapFunctionError(error)
  if (!data) throw new Error('Resposta vazia ao criar cobrança')
  return data
}

export async function refundAsaasOrder(orderId: string, reason: string, amount?: number): Promise<void> {
  const { error } = await supabase.functions.invoke('asaas-refund', {
    body: { orderId, reason, amount },
  })
  if (error) await unwrapFunctionError(error)
}
