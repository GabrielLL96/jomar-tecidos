import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { hasStaffAccess, isStaffRole, mfaStepQueryOptions } from '@/features/auth/mfa'
import { defaultRedirectFor } from '@/features/auth/redirects'
import { MfaChallenge } from '@/features/auth/components/MfaChallenge'
import { useSeoMeta } from '@/lib/seo'

function useMfaGuard() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isStaff = !!user && isStaffRole(user.role)
  const { data: step, error } = useQuery({
    ...mfaStepQueryOptions(user?.id ?? ''),
    enabled: isStaff,
  })
  const destination = searchParams.get('redirect') || (user ? defaultRedirectFor(user.role) : '/')

  useEffect(() => {
    if (isLoading) return
    if (!user) navigate('/conta/entrar', { replace: true })
    else if (!isStaff) navigate('/conta', { replace: true })
    else if (step && hasStaffAccess(step)) navigate(destination, { replace: true })
  }, [user, isLoading, isStaff, step, destination, navigate])

  const goToDestination = () => navigate(destination, { replace: true })
  return { step, error, goToDestination }
}

export function MfaPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { step, error, goToDestination } = useMfaGuard()

  useSeoMeta({
    title: 'Verificação em Duas Etapas',
    description: 'Verificação de segurança da conta Jomar Tecidos.',
    path: '/conta/mfa',
    noindex: true,
  })

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // Sem MFA ativo a página só redireciona — não desenha nada até saber que é
  // desafio, senão o título pisca antes do redirect.
  if (!error && step !== 'challenge') return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-8 text-center font-serif text-3xl font-medium">
        Verificação em duas etapas
      </h1>
      {error && <p className="text-destructive text-center text-sm">{error.message}</p>}
      {step === 'challenge' && <MfaChallenge onVerified={goToDestination} />}
      <Button variant="link" onClick={handleLogout} className="mt-6 w-full">
        Sair
      </Button>
    </main>
  )
}
