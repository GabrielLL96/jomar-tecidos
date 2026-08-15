import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useConsent } from './ConsentContext'

export function ConsentBanner() {
  const { isBannerOpen, consent, saveConsent } = useConsent()
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(consent?.categories.analytics ?? true)

  if (!isBannerOpen) return null

  return (
    <div className="bg-navy-dark fixed inset-x-0 bottom-0 z-50 px-6 py-5 text-[#c9c5e2] shadow-[0_-4px_16px_rgba(0,0,0,0.15)] md:px-12">
      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col gap-4">
        <p className="text-sm leading-relaxed">
          Usamos cookies essenciais (sempre ativos, necessários pro site funcionar) e, com sua
          permissão, cookies analíticos pra medir desempenho. Saiba mais na{' '}
          <Link to="/politica-de-privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>

        {isCustomizing && (
          <div className="flex flex-col gap-2 rounded-sm bg-white/5 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>Essenciais (sessão, carrinho, login) — sempre ativos</span>
              <span className="text-xs text-[#8f8bb0]">Obrigatório</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Analíticos (Google Analytics — mede uso do site)</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-navy"
                  checked={analyticsChecked}
                  onChange={(event) => setAnalyticsChecked(event.target.checked)}
                />
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          {!isCustomizing && (
            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="mr-auto text-sm underline"
            >
              Personalizar
            </button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => saveConsent({ analytics: false }, 'banner')}
            className="rounded-sm"
          >
            Recusar
          </Button>
          {isCustomizing ? (
            <Button
              type="button"
              size="sm"
              onClick={() => saveConsent({ analytics: analyticsChecked }, 'preferences')}
              className="rounded-sm"
            >
              Salvar preferências
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => saveConsent({ analytics: true }, 'banner')}
              className="rounded-sm"
            >
              Aceitar todos
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
