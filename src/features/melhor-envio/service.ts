import { supabase } from '@/lib/supabase'
import type { ShippingQuoteItemInput, ShippingQuoteOption } from './types'

const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br'
const OAUTH_STATE_STORAGE_KEY = 'melhor-envio:oauth-state'
const OAUTH_SCOPES = 'shipping-calculate'

export function buildAuthorizeUrl(clientId: string, redirectUri: string): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state)

  const url = new URL(`${MELHOR_ENVIO_SANDBOX_URL}/oauth/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', OAUTH_SCOPES)
  return url.toString()
}

export function consumeStoredOAuthState(): string | null {
  const state = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY)
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
  return state
}

// supabase-js só devolve a mensagem genérica ("non-2xx status code") em
// `error.message` — o corpo real ({error: "..."}) que as Edge Functions
// devolvem fica em `error.context`, uma Response que precisa ser lida à
// parte.
async function unwrapFunctionError(error: { message: string; context?: Response }): Promise<never> {
  let specificMessage: string | undefined
  if (error.context) {
    try {
      const body = (await error.context.json()) as { error?: string }
      specificMessage = body.error
    } catch {
      // corpo não era JSON — cai no throw genérico abaixo
    }
  }
  throw new Error(specificMessage ?? error.message)
}

export async function exchangeAuthorizationCode(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke('melhor-envio-oauth-exchange', { body: { code } })
  if (error) await unwrapFunctionError(error)
}

export async function calculateShipping(
  destinationZip: string,
  items: ShippingQuoteItemInput[],
): Promise<ShippingQuoteOption[]> {
  const { data, error } = await supabase.functions.invoke<{ options: ShippingQuoteOption[] }>(
    'melhor-envio-shipping-calculate',
    { body: { destinationZip, items } },
  )
  if (error) await unwrapFunctionError(error)
  return data?.options ?? []
}
