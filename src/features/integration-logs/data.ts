export const INTEGRATION_LABELS: Record<string, string> = {
  asaas: 'Asaas',
  melhor_envio: 'Melhor Envio',
}

export const OPERATION_LABELS: Record<string, string> = {
  create_charge: 'Criar cobrança',
  create_charge_card: 'Criar cobrança (cartão)',
  create_charge_token: 'Criar cobrança (cartão salvo)',
  create_customer: 'Criar cliente',
  refund: 'Reembolsar',
  get_pix_qrcode: 'Buscar QR code Pix',
  webhook_received: 'Webhook recebido',
  calculate_shipping: 'Calcular frete',
  oauth_exchange: 'Conectar (OAuth)',
  refresh_token: 'Renovar token',
}

export const INTEGRATION_STATUS_LABELS: Record<string, string> = {
  success: 'Sucesso',
  failure: 'Falha',
  timeout: 'Timeout',
}

export const INTEGRATION_STATUS_STYLES: Record<string, string> = {
  success: 'bg-[#e2f2e6] text-[#1e7a44]',
  failure: 'bg-[#f8dede] text-[#b0362b]',
  timeout: 'bg-[#fbeed4] text-[#8c5a0a]',
}

export const ENVIRONMENT_LABELS: Record<string, string> = {
  sandbox: 'Sandbox',
  production: 'Produção',
}
