import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/conta/entrar', { replace: true })
  }, [user, navigate])

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-20">
      <h1 className="text-navy-dark mb-2 font-serif text-[30px] font-medium">Olá, {user.name}</h1>
      <p className="text-text-body mb-8 text-sm">{user.email}</p>
      <p className="text-text-body mb-8 text-sm">Você ainda não tem pedidos.</p>
      <Button variant="outline" onClick={logout} className="h-auto rounded-sm px-6 py-3 text-sm">
        Sair da conta
      </Button>
    </main>
  )
}
