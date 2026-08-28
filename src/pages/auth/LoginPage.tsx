import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth, type AuthUser } from '@/features/auth/AuthContext'
import { useSeoMeta } from '@/lib/seo'
import { supabase } from '@/lib/supabase'
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@/features/auth/schema'

// Sem `?redirect=` explícito (ex.: checkout mandando de volta pra si mesmo),
// o destino padrão depende do papel do usuário — admin vai pro painel, não
// pra área de cliente. Um `?redirect=` explícito sempre vence (um admin
// tentando comprar como cliente não deve ser forçado de volta pro painel).
function defaultRedirectFor(role: AuthUser['role']) {
  return role === 'admin' ? '/admin' : '/conta'
}

function useRedirectParam() {
  const [searchParams] = useSearchParams()
  return searchParams.get('redirect')
}

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const redirectParam = useRedirectParam()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    try {
      const profile = await login(data)
      toast.success('Login realizado com sucesso')
      navigate(redirectParam || defaultRedirectFor(profile.role))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar')
      // Sem sessão, não há auth.uid() verificável — user_email aqui é o que
      // o formulário tentou, não uma identidade confirmada (mesma limitação
      // inerente a qualquer log de tentativa que falhou). Best-effort.
      void supabase.rpc('log_failed_login', { p_email: data.email })
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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className="pr-8"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
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
  // Cadastro novo sempre nasce como 'customer' — sem branch por role aqui.
  const redirectParam = useRedirectParam()
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
      navigate(redirectParam || '/conta')
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
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
          {errors.cpf && <p className="text-destructive text-xs">{errors.cpf.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="(00) 00000-0000" {...register('phone')} />
          {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="street">Endereço</Label>
        <Input id="street" {...register('street')} />
        {errors.street && <p className="text-destructive text-xs">{errors.street.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register('city')} />
          {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">UF</Label>
          <Input id="state" maxLength={2} {...register('state')} />
          {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="zipCode">CEP</Label>
        <Input id="zipCode" {...register('zipCode')} />
        {errors.zipCode && <p className="text-destructive text-xs">{errors.zipCode.message}</p>}
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
  const redirectParam = useRedirectParam()

  useSeoMeta({
    title: 'Entrar ou Criar Conta',
    description: 'Acesse sua conta Jomar Tecidos.',
    path: '/conta/entrar',
    noindex: true,
  })

  useEffect(() => {
    if (!isLoading && user) navigate(redirectParam || defaultRedirectFor(user.role), { replace: true })
  }, [user, isLoading, navigate, redirectParam])

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
