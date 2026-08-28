import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'
import type { ShippingQuoteItemInput, ShippingQuoteResult } from './types'

const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br'
// cart-write/shipping-checkout/shipping-generate/shipping-print/shipping-tracking
// adicionados pra Fase 2 (geração de etiqueta real) — conexão existente feita
// só com shipping-calculate precisa reconectar (reautorizar) pra ganhar esses
// escopos no token; token antigo continua só cotando frete.
const OAUTH_SCOPES =
  'shipping-calculate cart-write shipping-checkout shipping-generate shipping-print shipping-tracking'

// Mensagem que a janela popup do callback OAuth manda pra janela principal
// (window.opener) via postMessage.
export const MELHOR_ENVIO_OAUTH_MESSAGE_TYPE = 'melhor-envio-oauth-callback'

// `state` não fica em sessionStorage (o popup roda numa janela separada — se
// navegar por uma origem diferente e voltar, herdar sessionStorage do opener
// não é garantido em todo browser). Quem gera o state guarda em memória
// (useRef na janela principal) e valida o retorno vindo do popup via
// postMessage, ver MelhorEnvioIntegrationCard.
export function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
): { url: string; state: string } {
  const state = crypto.randomUUID()
  const url = new URL(`${MELHOR_ENVIO_SANDBOX_URL}/oauth/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', OAUTH_SCOPES)
  return { url: url.toString(), state }
}

export async function exchangeAuthorizationCode(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke('melhor-envio-oauth-exchange', {
    body: { code },
  })
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

export interface GenerateShippingLabelResult {
  shipmentId: string
  labelUrl: string
}

// Admin-only. Requer token OAuth reconectado com os escopos novos (ver
// OAUTH_SCOPES acima) e pedido com shipping_service_id + endereço de origem
// preenchido (Configurações > Frete) -- a Edge Function falha com mensagem
// clara se qualquer pré-requisito faltar, em vez de deixar a Melhor Envio
// rejeitar com erro genérico.
export async function generateShippingLabel(orderId: string): Promise<GenerateShippingLabelResult> {
  const { data, error } = await supabase.functions.invoke<GenerateShippingLabelResult>(
    'melhor-envio-generate-label',
    { body: { orderId } },
  )
  if (error) await unwrapFunctionError(error)
  if (!data) throw new Error('Resposta vazia ao gerar etiqueta')
  return data
}
