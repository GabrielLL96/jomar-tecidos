import {
  corsHeaders,
  createServiceClient,
  getValidAccessToken,
  melhorEnvioFetch,
  requireAdmin,
} from '../_shared/melhor-envio.ts'

interface GenerateLabelRequestBody {
  orderId: string
}

interface MelhorEnvioAddress {
  name: string
  phone?: string
  email?: string
  document: string
  address: string
  number: string
  district: string
  city: string
  country_id: string
  postal_code: string
  state_abbr: string
}

interface MelhorEnvioCartResponse {
  id: string
  protocol: string
}

// Best-effort: addresses.street histórico é texto livre único ("Rua X, 123")
// sem number/district separados — só endereços cadastrados depois da coluna
// nova (addresses.number/district) têm os campos de verdade. Sem esse
// fallback, todo endereço antigo bloquearia geração de etiqueta.
function splitStreetFallback(street: string): { address: string; number: string } {
  const lastComma = street.lastIndexOf(',')
  if (lastComma === -1) return { address: street.trim(), number: 'S/N' }
  return {
    address: street.slice(0, lastComma).trim(),
    number: street.slice(lastComma + 1).trim() || 'S/N',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req.headers.get('Authorization'))

    const { orderId } = (await req.json()) as GenerateLabelRequestBody
    if (!orderId) throw new Error('orderId obrigatório')

    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, shipping_service_id, shipping_address_id, ' +
          'users(name, email, phone, cpf), ' +
          'addresses(street, number, district, city, state, zip_code), ' +
          'order_items(meters, unit_price, total, products(name, weight_grams, package_height_cm, package_width_cm, package_length_cm))',
      )
      .eq('id', orderId)
      .single()
    if (orderError) throw new Error(`Falha ao ler pedido: ${orderError.message}`)

    // Etiqueta só depois de pago — evita comprar frete (dinheiro real da
    // carteira Melhor Envio) pra pedido que pode nem ser confirmado.
    if (!['paid', 'shipping', 'delivered'].includes(order.status)) {
      throw new Error('Só é possível gerar etiqueta pra pedido pago')
    }
    if (!order.shipping_service_id) {
      throw new Error(
        'Pedido sem serviço de frete registrado (pedidos antigos, de antes desta função existir, não têm essa informação)',
      )
    }

    const { data: existingDelivery } = await supabase
      .from('deliveries')
      .select('id, melhor_envio_shipment_id, melhor_envio_label_url')
      .eq('order_id', orderId)
      .maybeSingle()
    // label_url só existe depois do passo 4 (print) completar — bloqueia
    // repetir só quando de fato terminou. shipment_id sem label_url significa
    // que um carrinho/compra anterior ficou pela metade (ex: checkout falhou
    // por saldo insuficiente na carteira) — retry reaproveita o mesmo
    // shipmentId em vez de criar outro carrinho órfão na Melhor Envio.
    if (existingDelivery?.melhor_envio_label_url) {
      throw new Error('Esse pedido já tem etiqueta gerada')
    }

    const user = order.users as unknown as {
      name: string
      email: string
      phone: string | null
      cpf: string | null
    }
    if (!user.cpf) throw new Error('Cliente sem CPF cadastrado — não é possível gerar etiqueta')

    const address = order.addresses as unknown as {
      street: string
      number: string | null
      district: string | null
      city: string
      state: string
      zip_code: string
    }
    const streetFallback = splitStreetFallback(address.street)

    const { data: originRows, error: originError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'footer_address',
        'footer_city',
        'footer_zip',
        'footer_phone_href',
        'footer_email',
        'origin_number',
        'origin_district',
        'origin_document',
      ])
    if (originError) throw new Error(`Falha ao ler endereço de origem: ${originError.message}`)
    const origin = Object.fromEntries((originRows ?? []).map((row) => [row.key, row.value]))

    if (!origin.origin_document || !origin.origin_number) {
      throw new Error(
        'Endereço de origem incompleto (Configurações > Frete > número/CNPJ) — preencha antes de gerar etiqueta',
      )
    }

    const [originCity, originState] = (origin.footer_city ?? '').split(',').map((s) => s.trim())
    const originStreetFallback = splitStreetFallback(origin.footer_address ?? '')

    const from: MelhorEnvioAddress = {
      name: 'Jomar Tecidos e Enxovais',
      phone: origin.footer_phone_href ?? undefined,
      email: origin.footer_email ?? undefined,
      document: origin.origin_document,
      address: originStreetFallback.address,
      number: origin.origin_number,
      district: origin.origin_district ?? '',
      city: originCity ?? '',
      state_abbr: originState ?? '',
      country_id: 'BR',
      postal_code: (origin.footer_zip ?? '').replace(/\D/g, ''),
    }

    const to: MelhorEnvioAddress = {
      name: user.name,
      phone: user.phone ?? undefined,
      email: user.email,
      document: user.cpf.replace(/\D/g, ''),
      address: address.number ? address.street : streetFallback.address,
      number: address.number ?? streetFallback.number,
      district: address.district ?? '',
      city: address.city,
      state_abbr: address.state,
      country_id: 'BR',
      postal_code: address.zip_code.replace(/\D/g, ''),
    }

    const orderItems = order.order_items as unknown as {
      meters: number
      unit_price: number
      total: number
      products: {
        name: string
        weight_grams: number | null
        package_height_cm: number | null
        package_width_cm: number | null
        package_length_cm: number | null
      } | null
    }[]

    const missingPackageData = orderItems.some((item) => !item.products?.weight_grams)
    if (missingPackageData) {
      throw new Error(
        'Produto do pedido sem peso/dimensão cadastrados — não é possível gerar etiqueta real',
      )
    }

    const products = orderItems.map((item) => ({
      name: item.products!.name,
      quantity: '1',
      unitary_value: String(item.unit_price),
    }))
    const volumes = orderItems.map((item) => ({
      height: Number(item.products!.package_height_cm ?? 0),
      width: Number(item.products!.package_width_cm ?? 0),
      length: Number(item.products!.package_length_cm ?? 0),
      weight: Math.ceil((item.products!.weight_grams ?? 0) * item.meters) / 1000,
    }))

    const accessToken = await getValidAccessToken()
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Jomar Tecidos (contato@jomartecidos.com.br)',
    }

    let shipmentId = existingDelivery?.melhor_envio_shipment_id ?? null

    if (!shipmentId) {
      // 1. Carrinho — reserva o serviço escolhido no checkout pra este envio.
      const cartResult = (await melhorEnvioFetch(
        '/api/v2/me/cart',
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            service: order.shipping_service_id,
            from,
            to,
            products,
            volumes,
            options: {
              insurance_value: orderItems.reduce((sum, item) => sum + item.total, 0),
              receipt: false,
              own_hand: false,
              reverse: false,
              non_commercial: true,
            },
          }),
        },
        {
          operation: 'cart_add',
          relatedEntity: 'orders',
          relatedEntityId: orderId,
          requestSummary: { serviceId: order.shipping_service_id },
          summarizeResponse: (parsed) => {
            const r = parsed as MelhorEnvioCartResponse
            return { shipmentId: r.id, protocol: r.protocol }
          },
        },
      )) as MelhorEnvioCartResponse

      shipmentId = cartResult.id

      // Estado local salvo assim que o carrinho é criado (mesmo se os passos
      // seguintes falharem) — evita "etiqueta órfã" do lado da Melhor Envio
      // sem nenhum registro nosso, mesmo padrão já usado em
      // asaas-create-charge. Também é o que permite o retry acima reaproveitar
      // o shipmentId em vez de criar outro carrinho.
      const { error: insertDeliveryError } = await supabase.from('deliveries').upsert(
        {
          order_id: orderId,
          melhor_envio_shipment_id: shipmentId,
          melhor_envio_protocol: cartResult.protocol,
          status: 'awaiting_pickup',
        },
        { onConflict: 'order_id' },
      )
      if (insertDeliveryError)
        throw new Error(`Falha ao salvar entrega: ${insertDeliveryError.message}`)
    }
    if (!shipmentId) throw new Error('Falha interna: shipmentId ausente')

    // 2. Checkout — paga com saldo da carteira Melhor Envio (sem gateway
    // externo: usa o saldo existente na conta).
    await melhorEnvioFetch(
      '/api/v2/me/shipment/checkout',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orders: [shipmentId] }),
      },
      {
        operation: 'checkout',
        relatedEntity: 'deliveries',
        relatedEntityId: shipmentId,
        requestSummary: { orderId: shipmentId },
        summarizeResponse: () => ({ paid: true }),
      },
    )

    // 3. Geração — emite a etiqueta de verdade pro envio pago.
    await melhorEnvioFetch(
      '/api/v2/me/shipment/generate',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orders: [shipmentId] }),
      },
      {
        operation: 'generate',
        relatedEntity: 'deliveries',
        relatedEntityId: shipmentId,
        requestSummary: { orderId: shipmentId },
        summarizeResponse: () => ({ generated: true }),
      },
    )

    // 4. Impressão — link do PDF (privado, exige login na conta Melhor Envio
    // que gerou a etiqueta).
    const printResult = (await melhorEnvioFetch(
      '/api/v2/me/shipment/print',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orders: [shipmentId], mode: 'private' }),
      },
      {
        operation: 'print',
        relatedEntity: 'deliveries',
        relatedEntityId: shipmentId,
        requestSummary: { orderId: shipmentId },
        summarizeResponse: () => ({ printed: true }),
      },
    )) as { url: string }

    const { error: updateLabelError } = await supabase
      .from('deliveries')
      .update({ melhor_envio_label_url: printResult.url })
      .eq('order_id', orderId)
    if (updateLabelError)
      throw new Error(`Falha ao salvar link da etiqueta: ${updateLabelError.message}`)

    return new Response(JSON.stringify({ shipmentId, labelUrl: printResult.url }), {
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
