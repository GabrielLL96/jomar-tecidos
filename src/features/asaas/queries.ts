import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AsaasEnvironment, AsaasStatus } from './types'

export const ASAAS_SETTINGS_ID = '00000000-0000-0000-0000-000000000002'

export const asaasStatusQueryOptions = queryOptions({
  queryKey: ['asaas', 'status'] as const,
  queryFn: async (): Promise<AsaasStatus> => {
    // SELECT nunca traz api_key/webhook_token — GRANT de coluna já exclui
    // essas colunas pra `authenticated` (migration 20260813050000).
    // "*Configured" vem de uma function security definer à parte
    // (asaas_secrets_configured), nunca o valor do secret em si.
    const [{ data, error }, { data: secrets, error: secretsError }] = await Promise.all([
      supabase.from('asaas_settings').select('environment, connected_at').eq('id', ASAAS_SETTINGS_ID).maybeSingle(),
      supabase.rpc('asaas_secrets_configured').maybeSingle(),
    ])
    if (error) throw new Error(error.message)
    if (secretsError) throw new Error(secretsError.message)
    return {
      environment: (data?.environment as AsaasEnvironment) ?? 'sandbox',
      connectedAt: data?.connected_at ?? null,
      apiKeyConfigured: secrets?.api_key_configured ?? false,
      webhookTokenConfigured: secrets?.webhook_token_configured ?? false,
    }
  },
  staleTime: 30 * 1000,
})
