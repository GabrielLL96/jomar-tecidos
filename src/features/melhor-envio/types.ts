export interface MelhorEnvioStatus {
  clientId: string | null
  redirectUri: string | null
  connectedAt: string | null
  tokenExpiresAt: string | null
  secretConfigured: boolean
}

export type MelhorEnvioConnectResult = { success: true } | { success: false; message: string }

export interface ShippingQuoteItemInput {
  weightGrams: number
  heightCm: number
  widthCm: number
  lengthCm: number
  quantity: number
}

export interface ShippingQuoteOption {
  serviceId: number
  carrierName: string
  serviceName: string
  price: number
  deliveryDays: number | null
}
