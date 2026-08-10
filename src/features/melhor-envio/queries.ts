import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MelhorEnvioStatus } from './types'

export const MELHOR_ENVIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export const melhorEnvioStatusQueryOptions = queryOptions({
  queryKey: ['melhor-envio', 'status'] as const,
  queryFn: async (): Promise<MelhorEnvioStatus> => {
    // SELECT nunca traz client_secret/access_token/refresh_token — GRANT de
    // coluna já exclui essas colunas pra `authenticated` (ver migration
    // 20260810120000). "secretConfigured" vem de uma function security
    // definer à parte (melhor_envio_secret_configured, 20260810160000) —
    // só um boolean derivado, nunca o valor do secret em si.
    const [{ data, error }, { data: secretConfigured, error: secretError }] = await Promise.all([
      supabase
        .from('melhor_envio_settings')
        .select('client_id, redirect_uri, connected_at, token_expires_at')
        .eq('id', MELHOR_ENVIO_SETTINGS_ID)
        .maybeSingle(),
      supabase.rpc('melhor_envio_secret_configured'),
    ])
    if (error) throw new Error(error.message)
    if (secretError) throw new Error(secretError.message)
    return {
      clientId: data?.client_id ?? null,
      redirectUri: data?.redirect_uri ?? null,
      connectedAt: data?.connected_at ?? null,
      tokenExpiresAt: data?.token_expires_at ?? null,
      secretConfigured: secretConfigured ?? false,
    }
  },
  staleTime: 30 * 1000,
})
