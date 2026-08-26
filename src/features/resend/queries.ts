import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ResendStatus } from './types'

export const RESEND_SETTINGS_ID = '00000000-0000-0000-0000-000000000003'

export const resendStatusQueryOptions = queryOptions({
  queryKey: ['resend', 'status'] as const,
  queryFn: async (): Promise<ResendStatus> => {
    // SELECT nunca traz api_key — GRANT de coluna já exclui essa coluna pra
    // `authenticated` (migration 20260826000000). "*Configured" vem de uma
    // function security definer à parte (resend_secrets_configured), nunca
    // o valor do secret em si.
    const [{ data, error }, { data: secrets, error: secretsError }] = await Promise.all([
      supabase
        .from('resend_settings')
        .select('from_email, from_name, contact_notification_email, connected_at')
        .eq('id', RESEND_SETTINGS_ID)
        .maybeSingle(),
      supabase.rpc('resend_secrets_configured').maybeSingle(),
    ])
    if (error) throw new Error(error.message)
    if (secretsError) throw new Error(secretsError.message)
    return {
      fromEmail: data?.from_email ?? null,
      fromName: data?.from_name ?? null,
      contactNotificationEmail: data?.contact_notification_email ?? null,
      connectedAt: data?.connected_at ?? null,
      apiKeyConfigured: secrets?.api_key_configured ?? false,
      fromEmailConfigured: secrets?.from_email_configured ?? false,
    }
  },
  staleTime: 30 * 1000,
})
