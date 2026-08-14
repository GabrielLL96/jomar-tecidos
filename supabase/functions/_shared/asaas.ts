export const ASAAS_SETTINGS_ID = '00000000-0000-0000-0000-000000000002'

const ASAAS_BASE_URL_BY_ENV: Record<string, string> = {
  sandbox: 'https://api-sandbox.asaas.com',
  production: 'https://api.asaas.com',
}

export function getAsaasBaseUrl(environment: string): string {
  const baseUrl = ASAAS_BASE_URL_BY_ENV[environment]
  if (!baseUrl) throw new Error(`Ambiente Asaas desconhecido: ${environment}`)
  return baseUrl
}

// Header exato exigido pela Asaas — não usa `Authorization: Bearer` (ver
// docs.asaas.com/docs/authentication). Chave crua, sem prefixo.
export function asaasAuthHeaders(apiKey: string): Record<string, string> {
  return { access_token: apiKey, 'Content-Type': 'application/json' }
}
