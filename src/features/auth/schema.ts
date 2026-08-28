import { z } from 'zod'
import { isValidCPF } from '@/lib/cpf'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>

// CPF/telefone/endereço viram obrigatórios no cadastro — pré-requisito pra
// gerar etiqueta de envio real depois (Melhor Envio Fase 2, spec separado),
// que provavelmente exige esses dados do destinatário.
export const signupSchema = z
  .object({
    name: z.string().min(3, 'Informe seu nome completo'),
    email: z.string().email('Informe um e-mail válido'),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua senha'),
    // Normaliza pra dígitos antes de mandar pro trigger — sem isso,
    // "111.444.777-35" e "11144477735" (mesmo CPF, formatação diferente)
    // seriam strings DIFERENTES pro `unique` de users.cpf, furando a
    // constraint que deveria impedir CPF duplicado.
    cpf: z
      .string()
      .refine(isValidCPF, 'CPF inválido')
      .transform((value) => value.replace(/\D/g, '')),
    phone: z.string().min(10, 'Informe um telefone válido'),
    street: z.string().min(5, 'Informe o endereço'),
    city: z.string().min(2, 'Informe a cidade'),
    state: z.string().length(2, 'UF inválida'),
    zipCode: z.string().min(8, 'CEP inválido'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const accountDataSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  email: z.string().email('Informe um e-mail válido'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(6, 'A senha deve ter ao menos 6 caracteres')
    .optional()
    .or(z.literal('')),
})

export type AccountDataInput = z.infer<typeof accountDataSchema>
