import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { useCart } from '@/features/cart/CartContext'
import { useFavorites } from '@/features/favorites/FavoritesContext'
import { useAuth } from '@/features/auth/AuthContext'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Logo } from './Logo'

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { itemCount } = useCart()
  const { favoriteIds } = useFavorites()
  const { user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/tecidos?busca=${encodeURIComponent(searchTerm.trim())}`)
    setSearchOpen(false)
    setSearchTerm('')
  }

  return (
    <header
      className={cn(
        'border-border sticky top-0 z-20 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b px-6 py-4 backdrop-blur-md transition-colors md:px-12',
        isScrolled ? 'bg-background/80' : 'bg-background',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen(true)}
          className="text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
      </div>

      <nav className="hidden items-center justify-center gap-8 text-sm lg:flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('text-text-body-dark', isActive && 'text-navy font-semibold')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-self-end gap-3 whitespace-nowrap sm:gap-4 md:gap-5">
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar tecidos..."
              className="border-input h-9 w-40 rounded-sm border px-3 text-sm outline-none sm:w-56"
            />
            <button
              type="button"
              aria-label="Fechar busca"
              onClick={() => setSearchOpen(false)}
              className="text-text-meta"
            >
              <X className="size-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setSearchOpen(true)}
            className="text-foreground"
          >
            <Search className="size-[18px]" />
          </button>
        )}

        <NavLink
          to="/favoritos"
          aria-label="Favoritos"
          className="relative flex items-center text-foreground"
        >
          <Heart className="size-[18px]" />
          {favoriteIds.length > 0 && (
            <span className="bg-brand-red absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-xs font-semibold text-white">
              {favoriteIds.length}
            </span>
          )}
        </NavLink>

        <NavLink
          to={user ? '/conta' : '/conta/entrar'}
          aria-label={user ? `Minha conta — ${user.name}` : 'Entrar'}
          className="text-foreground"
        >
          <User className="size-[18px]" />
        </NavLink>

        <NavLink
          to="/carrinho"
          className="border-navy text-navy relative flex items-center gap-1.5 rounded-sm border px-3 py-2 text-sm font-medium sm:px-4"
        >
          <ShoppingBag className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Sacola</span>
          <span className="bg-brand-red flex size-[18px] items-center justify-center rounded-full text-xs font-semibold text-white">
            {itemCount}
          </span>
        </NavLink>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Logo />
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {NAV_ITEMS.map((item) => (
              <SheetClose asChild key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'rounded-sm px-3 py-2.5 text-sm text-text-body-dark',
                      isActive && 'bg-cream-secondary text-navy font-semibold',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
