export type AsaasEnvironment = 'sandbox' | 'production'

export interface AsaasStatus {
  environment: AsaasEnvironment
  connectedAt: string | null
  apiKeyConfigured: boolean
  webhookTokenConfigured: boolean
}
