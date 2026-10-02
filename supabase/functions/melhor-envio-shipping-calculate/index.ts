import {
  corsHeaders,
  createServiceClient,
  getValidAccessToken,
  melhorEnvioFetch,
  requireAuthenticated,
} from '../_shared/melhor-envio.ts'

interface ShippingItemInput {
  productId: string
  meters: number
}

interface CalculateRequestBody {
  destinationZip: string
  items: ShippingItemInput[]
}

interface ProductShippingRow {
  id: string
  status: string
  weight_grams: number | null
  package_height_cm: number | null
  package_width_cm: number | null
  package_length_cm: number | null
}

const roundMeters = (meters: number) => Math.round(meters * 100) / 100

// Mesmo formato que create_order() monta a partir de p_items pra comparar
// com shipping_quotes.items: { product_id: metros somados, 2 casas }.
function groupMetersByProduct(items: ShippingItemInput[]): Record<string, number> {
  const grouped: Record<string, number> = {}
  for (const item of items) {
    grouped[item.productId] = (grouped[item.productId] ?? 0) + Number(item.meters)
  }
  for (const productId of Object.keys(grouped)) {
    grouped[productId] = roundMeters(grouped[productId])
  }
  return grouped
}

interface MelhorEnvioQuote {
  id: number
  name: string
  price: string | null
  delivery_time: number | null
  company?: { name?: string }
  error?: string | null
}

// Erro de validação de entrada, seguro de mostrar ao cliente. Qualquer outro
// erro (token, API da Melhor Envio, banco) é detalhe técnico e vira a
// mensagem genérica abaixo — o client cai na taxa fixa estimada.
class UserFacingError extends Error {}

const GENERIC_ERROR_MESSAGE = 'Não foi possível calcular o frete agora. Usando taxa estimada.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await requireAuthenticated(req.headers.get('Authorization'))

    const { destinationZip, items } = (await req.json()) as CalculateRequestBody
    const cleanDestinationZip = (destinationZip ?? '').replace(/\D/g, '')
    if (cleanDestinationZip.length !== 8) throw new UserFacingError('CEP de destino inválido')
    if (!items || items.length === 0) throw new UserFacingError('Carrinho vazio')
    const invalidItem = items.some(
      (item) => typeof item.productId !== 'string' || !(Number(item.meters) > 0),
    )
    if (invalidItem) throw new UserFacingError('Item inválido no carrinho')

    const supabase = createServiceClient()

    // Peso/dimensão vêm de products, nunca do client — antes o client mandava
    // weightGrams/dimensões e dava pra cotar 1g e usar a cotação num pedido
    // pesado. A cotação fica amarrada a este carrinho em shipping_quotes.items.
    const metersByProduct = groupMetersByProduct(items)
    const productIds = Object.keys(metersByProduct)
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, status, weight_grams, package_height_cm, package_width_cm, package_length_cm')
      .in('id', productIds)
    if (productsError) throw new Error(`Falha ao ler produtos: ${productsError.message}`)

    const products = (productRows ?? []) as ProductShippingRow[]
    if (products.length !== productIds.length || products.some((p) => p.status === 'draft')) {
      throw new UserFacingError('Produto indisponível no carrinho')
    }
    const missingData = products.some(
      (p) => !p.weight_grams || !p.package_height_cm || !p.package_width_cm || !p.package_length_cm,
    )
    if (missingData) {
      throw new UserFacingError(
        'Produto sem peso/dimensão cadastrados — não é possível cotar frete real pra este pedido',
      )
    }

    const { data: siteSettings, error: siteSettingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', 'footer_zip')
      .maybeSingle()

    if (siteSettingsError)
      throw new Error(`Falha ao ler CEP de origem: ${siteSettingsError.message}`)
    const originZip = (siteSettings?.value ?? '').replace(/\D/g, '')
    if (originZip.length !== 8)
      throw new UserFacingError('CEP de origem (Configurações > Rodapé e contato) não configurado')

    const accessToken = await getValidAccessToken()

    // Payload/resposta não têm dado sensível (CEP não é PII isoladamente,
    // preço/prazo de transportadora é público) — seguro logar o resumo
    // inteiro, ao contrário dos fluxos de pagamento da Asaas.
    const quotes = (await melhorEnvioFetch(
      '/api/v2/me/shipment/calculate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Jomar Tecidos (contato@jomartecidos.com.br)',
        },
        body: JSON.stringify({
          from: { postal_code: originZip },
          to: { postal_code: cleanDestinationZip },
          // weight_grams é peso por metro — a linha pesa isso vezes os metros.
          // Altura/largura/comprimento da embalagem não escalam por metro.
          products: products.map((product) => ({
            id: product.id,
            width: product.package_width_cm,
            height: product.package_height_cm,
            length: product.package_length_cm,
            weight: Math.ceil(product.weight_grams! * metersByProduct[product.id]) / 1000,
            quantity: 1,
          })),
        }),
      },
      {
        operation: 'calculate_shipping',
        requestSummary: { destinationZip: cleanDestinationZip, itemCount: products.length },
        summarizeResponse: (parsed) => {
          const quotesResult = parsed as MelhorEnvioQuote[]
          return {
            optionCount: quotesResult.filter((q) => !q.error && q.price).length,
            cheapest:
              quotesResult
                .filter((q) => !q.error && q.price)
                .map((q) => Number(q.price))
                .sort((a, b) => a - b)[0] ?? null,
            // Sem isso, optionCount:0 não dizia o motivo — precisava re-testar
            // manualmente pra descobrir se era CEP sem cobertura (esperado,
            // ver rota intra-cidade) ou falha de verdade (token, config).
            rejections: quotesResult
              .filter((q) => q.error)
              .map((q) => ({ carrier: q.company?.name ?? q.name, error: q.error })),
          }
        },
      },
    )) as MelhorEnvioQuote[]
    const options = quotes
      .filter((quote) => !quote.error && quote.price)
      .map((quote) => ({
        serviceId: quote.id,
        carrierName: quote.company?.name ?? '',
        serviceName: quote.name,
        price: Number(quote.price),
        deliveryDays: quote.delivery_time ?? null,
      }))

    // Grava a cotação pra create_order() validar o shipping_cost contra um
    // preço real depois, em vez de confiar no valor que o checkout mandar.
    const { data: quoteRow, error: quoteError } = await supabase
      .from('shipping_quotes')
      .insert({
        destination_zip: cleanDestinationZip,
        options,
        user_id: userId,
        items: metersByProduct,
      })
      .select('id')
      .single()
    if (quoteError) throw new Error(`Falha ao salvar cotação: ${quoteError.message}`)

    return new Response(JSON.stringify({ options, quoteId: quoteRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Falhas da Melhor Envio já ficam em integration_logs (melhorEnvioFetch),
    // mas leitura de token/produtos/settings e insert da cotação não — o
    // console.error garante o detalhe nos logs da function.
    if (!(error instanceof UserFacingError))
      console.error('melhor-envio-shipping-calculate:', error)
    const message = error instanceof UserFacingError ? error.message : GENERIC_ERROR_MESSAGE
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
