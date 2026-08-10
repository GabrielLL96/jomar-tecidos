import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MelhorEnvioStatus } from './types'

export const MELHOR_ENVIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export const melhorEnvioStatusQueryOptions = queryOptions({
  queryKey: ['melhor-envio', 'status'] as const,
  queryFn: async (): Promise<MelhorEnvioStatus> => {
    // SELECT nunca traz client_secret/access_token/refresh_token — GRANT de
    // coluna já exclui essas colunas pra `authenticated` (ver migration
    // 20260810120000). O que vier aqui é só o que a tela pode mostrar.
    const { data, error } = await supabase
      .from('melhor_envio_settings')
      .select('client_id, redirect_uri, connected_at, token_expires_at')
      .eq('id', MELHOR_ENVIO_SETTINGS_ID)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return {
      clientId: data?.client_id ?? null,
      redirectUri: data?.redirect_uri ?? null,
      connectedAt: data?.connected_at ?? null,
      tokenExpiresAt: data?.token_expires_at ?? null,
    }
  },
  staleTime: 30 * 1000,
})
