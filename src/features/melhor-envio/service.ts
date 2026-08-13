import { supabase } from '@/lib/supabase'
import type { ShippingQuoteItemInput, ShippingQuoteResult } from './types'

const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br'
const OAUTH_SCOPES = 'shipping-calculate'

// Mensagem que a janela popup do callback OAuth manda pra janela principal
// (window.opener) via postMessage.
export const MELHOR_ENVIO_OAUTH_MESSAGE_TYPE = 'melhor-envio-oauth-callback'

// `state` não fica em sessionStorage (o popup roda numa janela separada — se
// navegar por uma origem diferente e voltar, herdar sessionStorage do opener
// não é garantido em todo browser). Quem gera o state guarda em memória
// (useRef na janela principal) e valida o retorno vindo do popup via
// postMessage, ver MelhorEnvioIntegrationCard.
export function buildAuthorizeUrl(clientId: string, redirectUri: string): { url: string; state: string } {
  const state = crypto.randomUUID()
  const url = new URL(`${MELHOR_ENVIO_SANDBOX_URL}/oauth/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', OAUTH_SCOPES)
  return { url: url.toString(), state }
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
): Promise<ShippingQuoteResult> {
  const { data, error } = await supabase.functions.invoke<ShippingQuoteResult>(
    'melhor-envio-shipping-calculate',
    { body: { destinationZip, items } },
  )
  if (error) await unwrapFunctionError(error)
  return data ?? { quoteId: '', options: [] }
}
