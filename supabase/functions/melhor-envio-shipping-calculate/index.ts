import {
  corsHeaders,
  createServiceClient,
  getValidAccessToken,
  MELHOR_ENVIO_BASE_URL,
  requireAuthenticated,
} from '../_shared/melhor-envio.ts'

interface ShippingItemInput {
  weightGrams: number
  heightCm: number
  widthCm: number
  lengthCm: number
  quantity: number
}

interface CalculateRequestBody {
  destinationZip: string
  items: ShippingItemInput[]
}

interface MelhorEnvioQuote {
  id: number
  name: string
  price: string | null
  delivery_time: number | null
  company?: { name?: string }
  error?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAuthenticated(req.headers.get('Authorization'))

    const { destinationZip, items } = (await req.json()) as CalculateRequestBody
    const cleanDestinationZip = (destinationZip ?? '').replace(/\D/g, '')
    if (cleanDestinationZip.length !== 8) throw new Error('CEP de destino inválido')
    if (!items || items.length === 0) throw new Error('Carrinho vazio')

    const missingData = items.some(
      (item) => !item.weightGrams || !item.heightCm || !item.widthCm || !item.lengthCm,
    )
    if (missingData) {
      throw new Error('Produto sem peso/dimensão cadastrados — não é possível cotar frete real pra este pedido')
    }

    const supabase = createServiceClient()
    const { data: siteSettings, error: siteSettingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', 'footer_zip')
      .maybeSingle()

    if (siteSettingsError) throw new Error(`Falha ao ler CEP de origem: ${siteSettingsError.message}`)
    const originZip = (siteSettings?.value ?? '').replace(/\D/g, '')
    if (originZip.length !== 8) throw new Error('CEP de origem (Configurações > Rodapé e contato) não configurado')

    const accessToken = await getValidAccessToken()

    const response = await fetch(`${MELHOR_ENVIO_BASE_URL}/api/v2/me/shipment/calculate`, {
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
        products: items.map((item, index) => ({
          id: String(index),
          width: item.widthCm,
          height: item.heightCm,
          length: item.lengthCm,
          weight: item.weightGrams / 1000,
          quantity: item.quantity,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error(`Melhor Envio recusou a cotação (${response.status}): ${await response.text()}`)
    }

    const quotes = (await response.json()) as MelhorEnvioQuote[]
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
      .insert({ destination_zip: cleanDestinationZip, options })
      .select('id')
      .single()
    if (quoteError) throw new Error(`Falha ao salvar cotação: ${quoteError.message}`)

    return new Response(JSON.stringify({ options, quoteId: quoteRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
