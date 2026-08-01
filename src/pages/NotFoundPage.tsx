import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-24 text-center">
      <h1 className="text-navy-dark mb-3 font-serif text-4xl font-medium">Página não encontrada</h1>
      <p className="text-text-body mb-8 text-sm">A página que você procura não existe ou foi movida.</p>
      <Link to="/">
        <Button size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
          Voltar à loja
        </Button>
      </Link>
    </main>
  )
}
