import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useConsent } from './ConsentContext'

export function ConsentBanner() {
  const { isBannerOpen, grant, deny } = useConsent()

  if (!isBannerOpen) return null

  return (
    <div className="bg-navy-dark fixed inset-x-0 bottom-0 z-50 px-6 py-5 text-[#c9c5e2] shadow-[0_-4px_16px_rgba(0,0,0,0.15)] md:px-12">
      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col items-center gap-4 md:flex-row md:justify-between">
        <p className="text-sm leading-relaxed">
          Usamos cookies pra melhorar sua experiência e medir o desempenho do site. Você pode aceitar ou
          recusar — isso não afeta sua capacidade de navegar ou comprar. Saiba mais na{' '}
          <Link to="/politica-de-privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={deny} className="rounded-sm">
            Recusar
          </Button>
          <Button type="button" size="sm" onClick={grant} className="rounded-sm">
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  )
}
