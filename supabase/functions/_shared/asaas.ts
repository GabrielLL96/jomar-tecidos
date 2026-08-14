import { createServiceClient } from './melhor-envio.ts'

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

export interface AsaasCredentials {
  environment: string
  apiKey: string
}

export async function getAsaasCredentials(): Promise<AsaasCredentials> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('asaas_settings')
    .select('environment, api_key')
    .eq('id', ASAAS_SETTINGS_ID)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler configuração Asaas: ${error.message}`)
  if (!data?.api_key) throw new Error('Asaas não configurada — conecte em Configurações > Integrações')
  return { environment: data.environment, apiKey: data.api_key }
}

async function asaasFetch(credentials: AsaasCredentials, path: string, init?: RequestInit) {
  const baseUrl = getAsaasBaseUrl(credentials.environment)
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...asaasAuthHeaders(credentials.apiKey), ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Asaas recusou a chamada ${path} (${response.status}): ${body}`)
  }
  return response.json()
}

// POST /v3/payments exige um `customer` (id do lado da Asaas) já cadastrado
// — não aceita dados do cliente inline na cobrança (achado documentado no
// spec). Lazy: só cria o customer na Asaas no primeiro checkout real de cada
// usuário, nunca pré-popula em massa.
export async function getOrCreateAsaasCustomer(credentials: AsaasCredentials, userId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('asaas_customer_id, name, email, phone, cpf')
    .eq('id', userId)
    .single()
  if (userError) throw new Error(`Falha ao ler usuário: ${userError.message}`)
  if (user.asaas_customer_id) return user.asaas_customer_id

  if (!user.cpf) throw new Error('Cadastro sem CPF — não é possível gerar cobrança real')

  const customer = await asaasFetch(credentials, '/v3/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      cpfCnpj: user.cpf.replace(/\D/g, ''),
      mobilePhone: user.phone?.replace(/\D/g, '') || undefined,
    }),
  })

  const { error: updateError } = await supabase
    .from('users')
    .update({ asaas_customer_id: customer.id })
    .eq('id', userId)
  if (updateError) throw new Error(`Falha ao salvar customer Asaas: ${updateError.message}`)

  return customer.id as string
}

export interface CreateAsaasPaymentInput {
  customerId: string
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  value: number
  dueDate: string
  externalReference: string
  successUrl?: string
}

export interface AsaasPaymentResult {
  id: string
  status: string
  invoiceUrl: string
  dueDate: string
}

export async function createAsaasPayment(
  credentials: AsaasCredentials,
  input: CreateAsaasPaymentInput,
): Promise<AsaasPaymentResult> {
  return asaasFetch(credentials, '/v3/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      externalReference: input.externalReference,
      ...(input.successUrl
        ? { callback: { successUrl: input.successUrl, autoRedirect: false } }
        : {}),
    }),
  })
}

export interface AsaasRefundResult {
  id: string
  status: string
}

// POST /v3/payments/{id}/refund — mesmo endpoint pros 3 métodos (confirmado
// na doc antes de assumir comportamento diferente por método), suporta
// valor parcial via `value` (omitir = reembolso total do que resta).
export async function refundAsaasPayment(
  credentials: AsaasCredentials,
  asaasPaymentId: string,
  value?: number,
): Promise<AsaasRefundResult> {
  return asaasFetch(credentials, `/v3/payments/${asaasPaymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify(value !== undefined ? { value } : {}),
  })
}

export interface AsaasPixQrCode {
  encodedImage: string
  payload: string
  expirationDate: string | null
}

// QR code/copia-e-cola NÃO vem na resposta de criação da cobrança — exige
// chamada separada (confirmado na doc antes de assumir o formato errado).
export async function getAsaasPixQrCode(
  credentials: AsaasCredentials,
  paymentId: string,
): Promise<AsaasPixQrCode> {
  return asaasFetch(credentials, `/v3/payments/${paymentId}/pixQrCode`)
}

// Pix/cartão têm processamento imediato (dueDate = hoje só formaliza o
// campo obrigatório da API); boleto ganha uma janela real de alguns dias
// pro cliente pagar. Usa componentes UTC explícitos, não
// `toISOString().slice(0,10)` — mesma armadilha de fuso já documentada em
// _Feedback.md pra código client-side; aqui roda no servidor, mas evitar o
// padrão por completo elimina qualquer dependência do fuso do runtime.
export function dueDateFor(billingType: CreateAsaasPaymentInput['billingType']): string {
  const days = billingType === 'BOLETO' ? 3 : 0
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
