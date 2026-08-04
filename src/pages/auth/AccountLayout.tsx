import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'

const ACCOUNT_NAV = [
  { to: '/conta', label: 'Resumo', end: true },
  { to: '/conta/pedidos', label: 'Meus Pedidos', end: false },
  { to: '/conta/enderecos', label: 'Endereços', end: false },
  { to: '/conta/dados', label: 'Dados da Conta', end: false },
] as const

export function AccountLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/conta/entrar', { replace: true })
  }, [user, navigate])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-10 md:px-12">
      <h1 className="text-navy-dark mb-8 font-serif text-[30px] font-medium">Minha conta</h1>
      <div className="grid grid-cols-1 gap-11 md:grid-cols-[230px_1fr]">
        <aside className="border-border flex flex-col gap-0.5 rounded-md border bg-white p-2">
          {ACCOUNT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-sm px-3.5 py-3 text-[13.5px] text-foreground',
                  isActive && 'bg-cream-secondary text-navy font-medium',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="text-brand-red rounded-sm px-3.5 py-3 text-left text-[13.5px]"
          >
            Sair
          </button>
        </aside>

        <Outlet />
      </div>
    </main>
  )
}
