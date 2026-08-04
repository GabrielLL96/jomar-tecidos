import { z } from 'zod'

export const checkoutSchema = z
  .object({
    fullName: z.string().min(3, 'Informe seu nome completo'),
    address: z.string().min(5, 'Informe o endereço'),
    city: z.string().min(2, 'Informe a cidade'),
    state: z.string().length(2, 'UF inválida'),
    zip: z.string().min(8, 'CEP inválido'),
    paymentMethod: z.enum(['credit_card', 'pix', 'boleto']),
    cardNumber: z.string().optional(),
  })
  .refine((data) => data.paymentMethod !== 'credit_card' || (data.cardNumber?.length ?? 0) >= 13, {
    message: 'Número do cartão inválido',
    path: ['cardNumber'],
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const PAYMENT_METHODS: { value: CheckoutInput['paymentMethod']; label: string }[] = [
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
]
