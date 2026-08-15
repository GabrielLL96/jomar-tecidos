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

// Dado de cartão cru (número/CVV/validade) trafega só nesse formato, direto
// pra Edge Function asaas-charge-card, nunca persistido em lugar nenhum do
// frontend (sem localStorage/useSecureStorage, sem log). Ver decisão de
// reabrir escopo PCI-DSS em _ADRs.md (ADR-016).
export interface ChargeCardInput {
  orderId: string
  installments?: number
  card: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  holderInfo: {
    postalCode: string
    addressNumber: string
    addressComplement?: string
  }
  saveCard: boolean
}

export interface ChargeCardResult {
  orderId: string
  status: string
  last4: string
}

export interface SavedCard {
  id: string
  lastFourDigits: string
  brand: string | null
  createdAt: string
}
