export type AsaasEnvironment = 'sandbox' | 'production'

export interface AsaasStatus {
  environment: AsaasEnvironment
  connectedAt: string | null
  apiKeyConfigured: boolean
  webhookTokenConfigured: boolean
}

export interface CreateChargeResult {
  invoiceUrl: string
  pixQrCode: string | null
  pixCopyPaste: string | null
  boletoUrl: string | null
}
