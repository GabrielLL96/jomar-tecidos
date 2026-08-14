import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'

export async function validateAsaasConnection(): Promise<void> {
  const { error } = await supabase.functions.invoke('asaas-validate-connection')
  if (error) await unwrapFunctionError(error)
}
