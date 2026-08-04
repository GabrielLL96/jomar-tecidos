import { z } from 'zod'

export const addressSchema = z.object({
  label: z.string().min(2, 'Informe um nome pra esse endereço'),
  street: z.string().min(5, 'Informe o endereço'),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'UF inválida'),
  zipCode: z.string().min(8, 'CEP inválido'),
})

export type AddressInput = z.infer<typeof addressSchema>
