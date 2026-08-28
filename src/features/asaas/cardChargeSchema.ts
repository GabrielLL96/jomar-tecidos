import { z } from 'zod'

// Schema padrão do form de cartão usado fora do checkout — hoje só a
// retentativa de cobrança na ConfirmationPage (pedido criado sem cobrança, ou
// com cobrança recusada). Validação de cartão duplicada de propósito em vez
// de reaproveitar checkoutSchema: aquele schema exige campos de entrega
// (nome/endereço/CEP) que não fazem sentido aqui — o pedido e o endereço já
// existem, só falta a cobrança.
export const cardChargeSchema = z
  .object({
    installments: z.number().int().min(1).max(3),
    cardHolderName: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvv: z.string().optional(),
    cardPostalCode: z.string().optional(),
    cardAddressNumber: z.string().optional(),
    cardAddressComplement: z.string().optional(),
    saveCard: z.boolean().optional(),
    // Presente = pagar com cartão salvo (token) — nesse caso os campos de
    // cartão cru acima ficam vazios e não são validados.
    savedCardId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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

export type CardChargeInput = z.infer<typeof cardChargeSchema>
