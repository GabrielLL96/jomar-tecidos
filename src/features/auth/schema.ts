import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    name: z.string().min(3, 'Informe seu nome completo'),
    email: z.string().email('Informe um e-mail válido'),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof signupSchema>

export const accountDataSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  email: z.string().email('Informe um e-mail válido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres').optional().or(z.literal('')),
})

export type AccountDataInput = z.infer<typeof accountDataSchema>
