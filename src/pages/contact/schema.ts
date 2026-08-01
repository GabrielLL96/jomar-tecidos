import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().email('Informe um e-mail válido'),
  message: z.string().min(10, 'Escreva uma mensagem com pelo menos 10 caracteres'),
})

export type ContactInput = z.infer<typeof contactSchema>
