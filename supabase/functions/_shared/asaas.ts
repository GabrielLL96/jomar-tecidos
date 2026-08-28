import { createServiceClient } from './melhor-envio.ts'
import {
  logIntegrationCall,
  maskDocument,
  type LogEnvironment,
  type LogStatus,
} from './integration-logger.ts'

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
  if (!data?.api_key)
    throw new Error('Asaas não configurada — conecte em Configurações > Integrações')
  return { environment: data.environment, apiKey: data.api_key }
}

// Formato real de erro da Asaas: { errors: [{ code, description }] }. Nunca
// inclui dado de cartão de volta no erro (confirmado na doc antes de assumir
// que era seguro repassar a mensagem pro client) — seguro propagar
// `description` pro usuário final (ex: "cartão sem limite disponível").
async function asaasErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    const description = body?.errors?.[0]?.description
    if (typeof description === 'string' && description) return description
  } catch {
    // corpo não era JSON — cai no genérico abaixo
  }
  return `Asaas recusou a chamada (HTTP ${response.status})`
}

function asaasLogEnvironment(environment: string): LogEnvironment {
  return environment === 'production' ? 'production' : 'sandbox'
}

interface AsaasLogMeta {
  operation: string
  relatedEntity?: string
  relatedEntityId?: string
  // SEMPRE um resumo explícito (allowlist) — nunca o body da requisição.
  // asaas-charge-card já tem uma invariante de código (ADR-016) proibindo
  // logar dado de cartão em qualquer lugar; um denylist genérico por nome de
  // campo erraria por omissão sempre que a Asaas mudar o shape da API.
  requestSummary?: Record<string, unknown> | null
  // Recebe a resposta já parseada e devolve só o que é seguro persistir —
  // por padrão null (nada é logado a menos que o call site decida incluir).
  summarizeResponse?: (parsed: unknown) => Record<string, unknown> | null
}

async function asaasFetch(
  credentials: AsaasCredentials,
  path: string,
  init: RequestInit | undefined,
  logMeta: AsaasLogMeta,
) {
  const startedAt = Date.now()
  let statusHttp: number | null = null
  let status: LogStatus = 'success'
  let errorMessage: string | null = null
  let parsed: unknown = null

  try {
    const baseUrl = getAsaasBaseUrl(credentials.environment)
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...asaasAuthHeaders(credentials.apiKey), ...(init?.headers ?? {}) },
    })
    statusHttp = response.status
    if (!response.ok) {
      status = 'failure'
      errorMessage = await asaasErrorMessage(response)
      throw new Error(errorMessage)
    }
    parsed = await response.json()
    return parsed
  } catch (error) {
    status = 'failure'
    if (!errorMessage) errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    throw error
  } finally {
    await logIntegrationCall({
      integration: 'asaas',
      operation: logMeta.operation,
      relatedEntity: logMeta.relatedEntity,
      relatedEntityId: logMeta.relatedEntityId,
      requestSummary: logMeta.requestSummary ?? null,
      responseSummary:
        status === 'success' && logMeta.summarizeResponse
          ? logMeta.summarizeResponse(parsed)
          : null,
      statusHttp,
      status,
      errorMessage,
      durationMs: Date.now() - startedAt,
      environment: asaasLogEnvironment(credentials.environment),
    })
  }
}

// x-forwarded-for pode vir com múltiplos IPs separados por vírgula (proxies
// encadeados) — o primeiro é o do cliente real. A Asaas exige explicitamente
// que remoteIp NUNCA seja o IP do servidor (ver doc de tokenização) — usar
// esse header em vez de qualquer IP de infraestrutura local.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim()
  if (!ip) throw new Error('Não foi possível identificar o IP do cliente')
  return ip
}

export interface AsaasCreditCardInput {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface AsaasCreditCardHolderInfoInput {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  addressComplement?: string
  phone: string
}

export interface AsaasCreditCardChargeResult extends AsaasPaymentResult {
  creditCardToken: string
  creditCardLastFour: string
  creditCardBrand: string | null
}

// POST /v3/payments com creditCard+creditCardHolderInfo: autorização
// acontece na hora (HTTP 200 sucesso / 400 recusa, nunca fica "pending"
// esperando o cliente preencher nada depois — diferente do fluxo de
// invoiceUrl). A resposta já inclui creditCardToken pra reuso futuro, sem
// precisar de uma chamada de tokenização separada.
export async function createAsaasPaymentWithCard(
  credentials: AsaasCredentials,
  input: {
    customerId: string
    value: number
    dueDate: string
    externalReference: string
    remoteIp: string
    creditCard: AsaasCreditCardInput
    creditCardHolderInfo: AsaasCreditCardHolderInfoInput
    installmentCount?: number
  },
): Promise<AsaasCreditCardChargeResult> {
  const raw = (await asaasFetch(
    credentials,
    '/v3/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: 'CREDIT_CARD',
        value: input.value,
        dueDate: input.dueDate,
        externalReference: input.externalReference,
        remoteIp: input.remoteIp,
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        ...(input.installmentCount && input.installmentCount > 1
          ? { installmentCount: input.installmentCount, totalValue: input.value }
          : {}),
      }),
    },
    {
      operation: 'create_charge_card',
      relatedEntity: 'orders',
      relatedEntityId: input.externalReference,
      // NUNCA inclui creditCard/creditCardHolderInfo — dado de cartão e CPF
      // nunca entram no log, nem mascarados (mesma invariante de
      // asaas-charge-card/index.ts).
      requestSummary: {
        billingType: 'CREDIT_CARD',
        value: input.value,
        installments: input.installmentCount ?? 1,
      },
      summarizeResponse: (parsed) => {
        const p = parsed as {
          id?: string
          status?: string
          creditCard?: { creditCardNumber?: string; creditCardBrand?: string }
        }
        // creditCardToken NUNCA entra no log — é um credential reutilizável;
        // se vazasse aqui, qualquer admin (não só o dono do pedido) poderia
        // reusar pra cobrar o cartão de novo, contornando a RLS de
        // saved_credit_cards (user_id = auth.uid()).
        return {
          id: p?.id ?? null,
          status: p?.status ?? null,
          last4: p?.creditCard?.creditCardNumber ?? null,
          brand: p?.creditCard?.creditCardBrand ?? null,
        }
      },
    },
  )) as {
    creditCard?: { creditCardToken?: string; creditCardNumber?: string; creditCardBrand?: string }
  } & {
    id: string
    status: string
    invoiceUrl: string
    dueDate: string
  }
  const card = raw?.creditCard ?? {}
  if (!card.creditCardToken)
    throw new Error('Asaas aprovou a cobrança mas não devolveu o token do cartão')
  return {
    id: raw.id,
    status: raw.status,
    invoiceUrl: raw.invoiceUrl,
    dueDate: raw.dueDate,
    creditCardToken: card.creditCardToken,
    creditCardLastFour: card.creditCardNumber!,
    creditCardBrand: card.creditCardBrand ?? null,
  }
}

// Mesmo endpoint, mas com creditCardToken salvo em vez de creditCard cru —
// dado de cartão nunca mais trafega depois do primeiro save.
export async function createAsaasPaymentWithToken(
  credentials: AsaasCredentials,
  input: {
    customerId: string
    value: number
    dueDate: string
    externalReference: string
    remoteIp: string
    creditCardToken: string
    installmentCount?: number
  },
): Promise<AsaasPaymentResult> {
  return asaasFetch(
    credentials,
    '/v3/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: 'CREDIT_CARD',
        value: input.value,
        dueDate: input.dueDate,
        externalReference: input.externalReference,
        remoteIp: input.remoteIp,
        creditCardToken: input.creditCardToken,
        ...(input.installmentCount && input.installmentCount > 1
          ? { installmentCount: input.installmentCount, totalValue: input.value }
          : {}),
      }),
    },
    {
      operation: 'create_charge_token',
      relatedEntity: 'orders',
      relatedEntityId: input.externalReference,
      requestSummary: {
        billingType: 'CREDIT_CARD',
        value: input.value,
        installments: input.installmentCount ?? 1,
      },
      summarizeResponse: (parsed) => {
        const p = parsed as { id?: string; status?: string }
        return { id: p?.id ?? null, status: p?.status ?? null }
      },
    },
  ) as Promise<AsaasPaymentResult>
}

// POST /v3/payments exige um `customer` (id do lado da Asaas) já cadastrado
// — não aceita dados do cliente inline na cobrança (achado documentado no
// spec). Lazy: só cria o customer na Asaas no primeiro checkout real de cada
// usuário, nunca pré-popula em massa.
export async function getOrCreateAsaasCustomer(
  credentials: AsaasCredentials,
  userId: string,
): Promise<string> {
  const supabase = createServiceClient()
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('asaas_customer_id, name, email, phone, cpf')
    .eq('id', userId)
    .single()
  if (userError) throw new Error(`Falha ao ler usuário: ${userError.message}`)
  if (user.asaas_customer_id) return user.asaas_customer_id

  if (!user.cpf) throw new Error('Cadastro sem CPF — não é possível gerar cobrança real')

  const customer = (await asaasFetch(
    credentials,
    '/v3/customers',
    {
      method: 'POST',
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpf.replace(/\D/g, ''),
        mobilePhone: user.phone?.replace(/\D/g, '') || undefined,
      }),
    },
    {
      operation: 'create_customer',
      relatedEntity: 'users',
      relatedEntityId: userId,
      // cpfCnpj É o dado mais provável de causar falha aqui (formato
      // inválido, duplicado) — vale mascarado (só últimos 3 dígitos), ao
      // contrário do fluxo de cobrança com cartão, que nunca inclui CPF de
      // jeito nenhum.
      requestSummary: { cpfCnpjMasked: maskDocument(user.cpf) },
      summarizeResponse: (parsed) => {
        const p = parsed as { id?: string }
        return { id: p?.id ?? null }
      },
    },
  )) as { id: string }

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
  // Sem juros: sempre installmentCount + totalValue, nunca installmentValue
  // (deixa a Asaas dividir e absorver o arredondamento na última parcela).
  installmentCount?: number
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
  return asaasFetch(
    credentials,
    '/v3/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: input.billingType,
        value: input.value,
        dueDate: input.dueDate,
        externalReference: input.externalReference,
        ...(input.successUrl
          ? { callback: { successUrl: input.successUrl, autoRedirect: true } }
          : {}),
        ...(input.installmentCount && input.installmentCount > 1
          ? { installmentCount: input.installmentCount, totalValue: input.value }
          : {}),
      }),
    },
    {
      operation: 'create_charge',
      relatedEntity: 'orders',
      relatedEntityId: input.externalReference,
      requestSummary: {
        billingType: input.billingType,
        value: input.value,
        installments: input.installmentCount ?? 1,
      },
      summarizeResponse: (parsed) => {
        const p = parsed as { id?: string; status?: string }
        return { id: p?.id ?? null, status: p?.status ?? null }
      },
    },
  ) as Promise<AsaasPaymentResult>
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
  return asaasFetch(
    credentials,
    `/v3/payments/${asaasPaymentId}/refund`,
    {
      method: 'POST',
      body: JSON.stringify(value !== undefined ? { value } : {}),
    },
    {
      operation: 'refund',
      requestSummary: { asaasPaymentId, value: value ?? null },
      summarizeResponse: (parsed) => {
        const p = parsed as { id?: string; status?: string }
        return { id: p?.id ?? null, status: p?.status ?? null }
      },
    },
  ) as Promise<AsaasRefundResult>
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
  return asaasFetch(credentials, `/v3/payments/${paymentId}/pixQrCode`, undefined, {
    operation: 'get_pix_qrcode',
    requestSummary: { paymentId },
    // encodedImage/payload NUNCA entram no log — não são secret, mas são o
    // próprio meio de pagamento (qualquer um com o payload consegue gerar o
    // QR e pagar aquela cobrança); sem valor de debug em persistir.
    summarizeResponse: () => ({ hasQrCode: true }),
  }) as Promise<AsaasPixQrCode>
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
