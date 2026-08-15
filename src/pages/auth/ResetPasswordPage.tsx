import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useSeoMeta } from '@/lib/seo'
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schema'

type PageStatus = 'checking' | 'ready' | 'invalid'

// tempo de sobra pro client trocar o code/token da URL (detectSessionInUrl)
// por uma sessão de recovery de verdade antes de desistir e mostrar "inválido".
const RECOVERY_TIMEOUT_MS = 4000

export function ResetPasswordPage() {
  useSeoMeta({
    title: 'Redefinir Senha',
    description: 'Defina uma nova senha pra sua conta Jomar Tecidos.',
    path: '/conta/redefinir-senha',
    noindex: true,
  })

  const navigate = useNavigate()
  const [status, setStatus] = useState<PageStatus>('checking')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    let active = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) setStatus('ready')
    })

    // se detectSessionInUrl já resolveu antes deste listener se inscrever,
    // a sessão de recovery pode já estar disponível — confere direto também.
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setStatus('ready')
    })

    const timeout = setTimeout(() => {
      if (active) setStatus((current) => (current === 'checking' ? 'invalid' : current))
    }, RECOVERY_TIMEOUT_MS)

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const onSubmit = async ({ password }: ResetPasswordInput) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Senha redefinida — entre novamente com a nova senha')
    await supabase.auth.signOut()
    navigate('/conta/entrar', { replace: true })
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-8 text-center font-serif text-3xl font-medium">
        Redefinir senha
      </h1>

      {status === 'checking' && (
        <p className="text-text-meta text-center text-sm">Verificando o link…</p>
      )}

      {status === 'invalid' && (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-text-body text-sm leading-relaxed">
            Esse link é inválido ou já expirou. Peça um novo link de redefinição.
          </p>
          <Link to="/conta/esqueci-senha" className="text-navy text-sm font-semibold">
            Solicitar novo link
          </Link>
        </div>
      )}

      {status === 'ready' && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" {...register('password')} autoFocus />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 h-auto rounded-sm py-4 text-sm">
            {isSubmitting ? 'Salvando…' : 'Redefinir senha'}
          </Button>
        </form>
      )}
    </main>
  )
}
