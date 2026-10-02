export interface MelhorEnvioStatus {
  clientId: string | null
  redirectUri: string | null
  connectedAt: string | null
  tokenExpiresAt: string | null
  secretConfigured: boolean
}

// Peso/dimensão são lidos de products pela edge function — o client só diz
// o que está no carrinho, e a cotação fica amarrada a esses itens.
export interface ShippingQuoteItemInput {
  productId: string
  meters: number
}

export interface ShippingQuoteOption {
  serviceId: number
  carrierName: string
  serviceName: string
  price: number
  deliveryDays: number | null
}

export interface ShippingQuoteResult {
  quoteId: string
  options: ShippingQuoteOption[]
}
