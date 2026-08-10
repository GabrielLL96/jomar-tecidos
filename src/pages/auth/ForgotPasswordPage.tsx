import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schema'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async ({ email }: ForgotPasswordInput) => {
    // resposta sempre igual, exista ou não o e-mail — a API do Supabase já
    // não erra pra "e-mail não encontrado" (só pra falha real de rede/rate
    // limit), então um erro aqui nunca revela se a conta existe.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/conta/redefinir-senha`,
    })
    if (error) {
      toast.error('Não foi possível enviar o e-mail agora. Tente novamente em instantes.')
      return
    }
    setSent(true)
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-8 text-center font-serif text-3xl font-medium">
        Esqueci minha senha
      </h1>

      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-text-body text-sm leading-relaxed">
            Se houver uma conta com esse e-mail, você vai receber um link pra redefinir sua senha em
            instantes. Confira também a caixa de spam.
          </p>
          <Link to="/conta/entrar" className="text-navy text-sm font-semibold">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <p className="text-text-body text-sm leading-relaxed">
            Informe o e-mail da sua conta — vamos enviar um link pra você redefinir a senha.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} autoFocus />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 h-auto rounded-sm py-4 text-sm">
            {isSubmitting ? 'Enviando…' : 'Enviar link de redefinição'}
          </Button>
          <Link to="/conta/entrar" className="text-navy text-center text-sm">
            Voltar para o login
          </Link>
        </form>
      )}
    </main>
  )
}
