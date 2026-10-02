import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { mfaStepQueryOptions } from '@/features/auth/mfa'
import { mfaPathWithRedirect } from '@/features/auth/redirects'

// Painel exige role admin E sessão aal2. Sem aal2 o banco já trata o admin
// como cliente (current_user_role(), migration 20261002150000) — este guard
// só evita renderizar um painel que falharia em toda query.
export function useAdminAccessGuard() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const { data: step } = useQuery({ ...mfaStepQueryOptions(user?.id ?? ''), enabled: isAdmin })

  useEffect(() => {
    if (isLoading) return
    if (!user) navigate('/conta/entrar', { replace: true })
    else if (!isAdmin) navigate('/', { replace: true })
    else if (step && step !== 'verified') {
      navigate(mfaPathWithRedirect(location.pathname + location.search), { replace: true })
    }
  }, [user, isLoading, isAdmin, step, location.pathname, location.search, navigate])

  return { hasAccess: !isLoading && isAdmin && step === 'verified' }
}
