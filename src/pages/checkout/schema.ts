import { z } from 'zod'

// Cartão de crédito não coleta dado nenhum de cartão aqui — a cobrança
// redireciona pra fatura hospedada da Asaas (nunca passa pelo nosso
// servidor, ver spec 2026-08-13-asaas-checkout-pagamento-design.md).
export const checkoutSchema = z.object({
  fullName: z.string().min(3, 'Informe seu nome completo'),
  address: z.string().min(5, 'Informe o endereço'),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'UF inválida'),
  zip: z.string().min(8, 'CEP inválido'),
  paymentMethod: z.enum(['credit_card', 'pix', 'boleto']),
  // Parcelamento sem juros, só cartão — mínimo de pedido pra oferecer 2x/3x
  // é decidido no componente (MIN_INSTALLMENT_TOTAL em CheckoutPage.tsx), não
  // aqui: o schema só garante que o valor em si está num intervalo válido.
  installments: z.number().int().min(1).max(3),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const PAYMENT_METHODS: { value: CheckoutInput['paymentMethod']; label: string }[] = [
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
]
