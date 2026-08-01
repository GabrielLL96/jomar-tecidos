import { Check } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ConfirmationPage() {
  const { id } = useParams()
  const location = useLocation()
  const state = location.state as { orderNumber?: string } | null

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-sm) px-6 py-24 text-center">
      <div className="bg-navy mx-auto mb-7 flex size-16 items-center justify-center rounded-full text-white">
        <Check className="size-7" />
      </div>
      <h1 className="text-navy-dark mb-3.5 font-serif text-[30px] font-medium">Pedido confirmado!</h1>
      <p className="text-text-body mb-2 text-[14.5px] leading-relaxed">
        Obrigado por comprar na Jomar Tecidos. Seu pedido <strong>#{state?.orderNumber ?? id}</strong> está
        sendo preparado.
      </p>
      <p className="text-text-body mb-8 text-[14.5px] leading-relaxed">
        Você receberá atualizações por e-mail e poderá acompanhar o status a qualquer momento.
      </p>
      <Link to="/">
        <Button size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
          Voltar à loja
        </Button>
      </Link>
    </main>
  )
}
