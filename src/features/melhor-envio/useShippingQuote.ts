import { useEffect, useState } from 'react'
import type { Product } from '@/features/catalog/types'
import { calculateShipping } from './service'
import type { ShippingQuoteOption } from './types'

interface ShippingCartItem {
  productId: string
  meters: number
}

interface UseShippingQuoteResult {
  options: ShippingQuoteOption[]
  selectedServiceId: number | null
  setSelectedServiceId: (id: number) => void
  quoteId: string | null
  isCalculating: boolean
  error: string | null
  missingData: boolean
  // Distinto de `error` genérico (falha de rede/API) — este é uma resposta
  // válida da cotação dizendo que nenhuma transportadora atende o CEP.
  // Usado pelo checkout pra travar a compra, não só avisar.
  noCarriersAvailable: boolean
}

// Cotação real de frete com cálculo automático — usado no carrinho (simulação,
// sem exigir login) e no checkout (cotação de verdade, o quoteId vai pro
// create_order() validar o preço no servidor). Dispara sozinho quando o CEP
// completa 8 dígitos, com debounce de 600ms pra não chamar a cada tecla.
export function useShippingQuote(
  zip: string | undefined,
  items: ShippingCartItem[],
  products: Product[],
  enabled = true,
): UseShippingQuoteResult {
  const [options, setOptions] = useState<ShippingQuoteOption[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noCarriersAvailable, setNoCarriersAvailable] = useState(false)

  // Só decide se dá pra cotar (fallback de taxa fixa quando falta dado) — o
  // peso/dimensão usado na cotação é lido de products pela edge function.
  const missingData = items.some((item) => {
    const product = products.find((p) => p.id === item.productId)
    return (
      !product?.weightGrams ||
      !product.packageHeightCm ||
      !product.packageWidthCm ||
      !product.packageLengthCm
    )
  })

  const cleanZip = (zip ?? '').replace(/\D/g, '')
  // Sinatura do "estado de entrada" da cotação — muda sempre que zip/enabled/
  // missingData mudam. Reseta a cotação anterior (era pra outro
  // endereço/estado) direto no corpo do componente, sem useEffect — padrão
  // "ajustar state durante o render" já documentado no projeto (React
  // Compiler rejeita setState síncrono dentro de useEffect como erro de lint,
  // não warning, ver skills/reactjs.md).
  // create_order() rejeita cotação cujo carrinho difere do pedido — mudar
  // metragem (não só adicionar/remover linha) precisa recotar.
  const itemsSignature = items.map((item) => `${item.productId}:${item.meters}`).join('|')
  const inputKey = `${cleanZip}:${enabled}:${missingData}:${itemsSignature}`
  const [syncedInputKey, setSyncedInputKey] = useState<string | null>(null)
  if (inputKey !== syncedInputKey) {
    setSyncedInputKey(inputKey)
    setOptions([])
    setSelectedServiceId(null)
    setQuoteId(null)
    setError(null)
    setNoCarriersAvailable(false)
  }

  useEffect(() => {
    if (cleanZip.length !== 8 || !enabled || missingData || items.length === 0) return

    const timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)
      setNoCarriersAvailable(false)
      try {
        const quoteItems = items.map((item) => ({
          productId: item.productId,
          meters: item.meters,
        }))
        const { quoteId: id, options: opts } = await calculateShipping(cleanZip, quoteItems)
        if (opts.length === 0) {
          setError('Nenhuma transportadora disponível pra este CEP')
          setNoCarriersAvailable(true)
          return
        }
        setOptions(opts)
        setSelectedServiceId(opts[0].serviceId)
        setQuoteId(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível cotar o frete')
      } finally {
        setIsCalculating(false)
      }
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanZip, enabled, missingData, itemsSignature])

  return {
    options,
    selectedServiceId,
    setSelectedServiceId,
    quoteId,
    isCalculating,
    error,
    missingData,
    noCarriersAvailable,
  }
}
