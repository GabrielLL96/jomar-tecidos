import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'

// LGPD: consentimento tem que ser opt-in explícito (nunca pré-marcado, nunca
// assumido), revisável a qualquer momento (reopen, ligado ao link
// "Preferências de Cookies" no rodapé) — nunca dispara nenhuma tag de
// rastreio (GoogleTagManager.tsx) antes do usuário decidir.
type ConsentValue = 'granted' | 'denied' | null

interface ConsentContextValue {
  consent: ConsentValue
  isBannerOpen: boolean
  grant: () => void
  deny: () => void
  reopen: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [consent, setConsent] = useState<ConsentValue>(() => getItem<ConsentValue>('cookie-consent', null))
  const [forceOpen, setForceOpen] = useState(false)

  const grant = () => {
    setConsent('granted')
    setItem('cookie-consent', 'granted')
    setForceOpen(false)
  }

  const deny = () => {
    // Se o GTM já tinha sido carregado antes (usuário reabriu preferências
    // depois de ter aceitado), só marcar 'denied' não remove script/cookie
    // já ativo — precisa de reload pra garantir que a tag não volte a
    // rodar. Sem consentimento prévio, não há nada rodando, reload seria
    // ruído desnecessário.
    const hadActiveTracking = consent === 'granted'
    setConsent('denied')
    setItem('cookie-consent', 'denied')
    setForceOpen(false)
    if (hadActiveTracking) window.location.reload()
  }

  const reopen = () => setForceOpen(true)

  return (
    <ConsentContext.Provider
      value={{ consent, isBannerOpen: consent === null || forceOpen, grant, deny, reopen }}
    >
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const context = useContext(ConsentContext)
  if (!context) throw new Error('useConsent precisa estar dentro de ConsentProvider')
  return context
}
