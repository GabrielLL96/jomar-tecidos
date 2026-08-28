import { z } from 'zod'

// Cartão de crédito: dado de cartão É coletado aqui desde a decisão que
// reabriu escopo PCI-DSS (SAQ A-EP, ver ADR-016 "Investigação adicional" +
// correção posterior) — vai direto pra Edge Function asaas-charge-card,
// nunca fica em nenhum estado persistido além do form em memória. Campos só
// são obrigatórios quando paymentMethod === 'credit_card' (superRefine),
// pra não exigir CVV de quem vai pagar Pix/boleto.
export const checkoutSchema = z
  .object({
    fullName: z.string().min(3, 'Informe seu nome completo'),
    address: z.string().min(5, 'Informe o endereço'),
    city: z.string().min(2, 'Informe a cidade'),
    state: z.string().length(2, 'UF inválida'),
    zip: z.string().min(8, 'CEP inválido'),
    paymentMethod: z.enum(['credit_card', 'pix', 'boleto']),
    // Parcelamento sem juros, só cartão — mínimo de pedido pra oferecer 2x/3x
    // é decidido no componente (MIN_INSTALLMENT_TOTAL em CheckoutPage.tsx),
    // não aqui: o schema só garante que o valor em si está num intervalo
    // válido.
    installments: z.number().int().min(1).max(3),
    cardHolderName: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvv: z.string().optional(),
    cardPostalCode: z.string().optional(),
    cardAddressNumber: z.string().optional(),
    cardAddressComplement: z.string().optional(),
    saveCard: z.boolean().optional(),
    // Presente só quando o cliente escolhe pagar com um cartão já salvo —
    // nesse caso nenhum campo de cartão cru é preenchido/validado (a cobrança
    // vai por token, ver chargeAsaasWithSavedCard). Ausente = cartão novo.
    savedCardId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== 'credit_card') return
    if (data.savedCardId) return

    const requireField = (field: keyof typeof data, message: string) => {
      const value = data[field]
      if (typeof value !== 'string' || value.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: [field], message })
      }
    }
    requireField('cardHolderName', 'Nome como está no cartão')
    requireField('cardPostalCode', 'CEP inválido')
    requireField('cardAddressNumber', 'Informe o número')

    const digits = (data.cardNumber ?? '').replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) {
      ctx.addIssue({ code: 'custom', path: ['cardNumber'], message: 'Número de cartão inválido' })
    }
    if (!/^\d{2}\/\d{2}$/.test(data.cardExpiry ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['cardExpiry'], message: 'Use MM/AA' })
    }
    if (!/^\d{3,4}$/.test(data.cardCvv ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['cardCvv'], message: 'CVV inválido' })
    }
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const PAYMENT_METHODS: { value: CheckoutInput['paymentMethod']; label: string }[] = [
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
]
