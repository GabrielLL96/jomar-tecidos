import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Package, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, end: false },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, end: false },
] as const

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: 'Resumo', subtitle: 'Visão geral do negócio hoje' },
  '/admin/produtos': { title: 'Produtos', subtitle: 'Gerencie o catálogo de tecidos e aviamentos' },
  '/admin/configuracoes': {
    title: 'Configurações',
    subtitle: 'Conteúdo da home, categorias e informações de contato',
  },
}

export function AdminLayout() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate('/conta/entrar', { replace: true })
      return
    }
    if (user.role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [user, isLoading, navigate])

  if (isLoading || !user || user.role !== 'admin') return null

  const meta = PAGE_META[location.pathname] ?? PAGE_META['/admin']


  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="bg-cream-secondary flex min-h-svh">
      <aside className="bg-navy-dark flex w-60 shrink-0 flex-col text-[#c9c5e2]">
        <div className="border-b border-[#2a2778] px-[22px] py-6">
          <div className="font-serif text-lg font-semibold text-white">Jomar Admin</div>
          <div className="mt-0.5 text-[10.5px] tracking-[0.1em] text-[#8b86b8] uppercase">
            Painel de gestão
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-[11px] rounded-[5px] px-3 py-2.5 text-[13.5px]',
                  isActive ? 'bg-navy text-white' : 'text-[#c9c5e2]',
                )
              }
            >
              <item.icon className="size-[15px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-[#2a2778] px-[22px] py-4">
          <div className="bg-brand-red flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white">
            {user.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-white">
              {user.name}
            </div>
            <div className="text-[11px] text-[#8b86b8]">Administrador</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className="flex size-8 shrink-0 items-center justify-center rounded-[5px] text-[#8b86b8]"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#e4ddd0] bg-white px-8 py-[18px]">
          <div>
            <h1 className="text-navy-dark font-serif text-[22px] font-semibold">{meta.title}</h1>
            <div className="mt-0.5 text-[12.5px] text-[#8c8375]">{meta.subtitle}</div>
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#a39a8c]" />
            <input
              placeholder="Buscar…"
              className="w-[220px] rounded-[5px] border border-[#d8d0c0] py-2.5 pr-3.5 pl-9 text-[13px]"
            />
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
