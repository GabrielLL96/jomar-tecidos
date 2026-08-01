import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { loginSchema, type LoginInput } from '@/features/auth/schema'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    if (user) navigate('/conta', { replace: true })
  }, [user, navigate])

  const onSubmit = (data: LoginInput) => {
    login(data)
    toast.success('Login realizado com sucesso')
    navigate('/conta')
  }

  if (user) return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-2 font-serif text-[30px] font-medium">Entrar</h1>
      <p className="text-text-body mb-8 text-sm">
        Ambiente de demonstração — qualquer e-mail e senha válidos entram.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>
        <Button type="submit" size="lg" className="mt-2 h-auto rounded-sm py-4 text-sm">
          Entrar
        </Button>
      </form>
    </main>
  )
}
