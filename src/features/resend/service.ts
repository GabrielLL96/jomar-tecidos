import { supabase } from '@/lib/supabase'
import { unwrapFunctionError } from '@/lib/edge-functions'

export async function validateResendConnection(): Promise<void> {
  const { error } = await supabase.functions.invoke('resend-validate-connection')
  if (error) await unwrapFunctionError(error)
}

// Best-effort de propósito nos dois call sites (checkout, mudança de status
// no admin) — falha de e-mail nunca deve travar o fluxo real (pedido criado,
// status atualizado); erro só é logado no console pelo chamador.
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-order-confirmation-email', {
    body: { orderId },
  })
  if (error) await unwrapFunctionError(error)
}

export async function sendOrderStatusEmail(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-order-status-email', {
    body: { orderId },
  })
  if (error) await unwrapFunctionError(error)
}

export interface ContactEmailInput {
  name: string
  email: string
  message: string
}

// Endpoint público (sem JWT de usuário) — chamado por qualquer visitante em
// /contato, autenticado só pela apikey pública do projeto.
export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const { error } = await supabase.functions.invoke('send-contact-email', { body: input })
  if (error) await unwrapFunctionError(error)
}
