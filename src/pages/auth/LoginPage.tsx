import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthContext'
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@/features/auth/schema'

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data)
      toast.success('Login realizado com sucesso')
      navigate('/conta')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link to="/conta/esqueci-senha" className="text-navy text-xs">
            Esqueci minha senha
          </Link>
        </div>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="lg" className="mt-2 h-auto rounded-sm py-4 text-sm">
        Entrar
      </Button>
    </form>
  )
}

function SignupForm() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupInput) => {
    try {
      const { requiresEmailConfirmation } = await signup(data)
      if (requiresEmailConfirmation) {
        toast.success('Conta criada! Confirme seu e-mail para poder entrar.')
        return
      }
      toast.success('Conta criada com sucesso')
      navigate('/conta')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a conta')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input id="signup-email" type="email" {...register('email')} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password">Senha</Label>
        <Input id="signup-password" type="password" {...register('password')} />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" size="lg" className="mt-2 h-auto rounded-sm py-4 text-sm">
        Criar conta
      </Button>
    </form>
  )
}

export function LoginPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) navigate('/conta', { replace: true })
  }, [user, isLoading, navigate])

  if (isLoading || user) return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-8 text-center font-serif text-3xl font-medium">Minha conta</h1>

      <Tabs defaultValue="login">
        <TabsList className="border-border mb-7 h-auto w-full gap-0 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="login"
            className="h-auto flex-1 rounded-none border-b-2 border-transparent py-3 text-sm data-active:border-navy data-active:bg-transparent data-active:shadow-none"
          >
            Entrar
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="h-auto flex-1 rounded-none border-b-2 border-transparent py-3 text-sm data-active:border-navy data-active:bg-transparent data-active:shadow-none"
          >
            Criar conta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        <TabsContent value="signup">
          <SignupForm />
        </TabsContent>
      </Tabs>
    </main>
  )
}
