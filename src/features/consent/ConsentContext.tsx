import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'

// LGPD (achados da auditoria docs/lgpd/auditoria-2026-08-15.md):
// 1. Consentimento tem que ser granular por finalidade, não "tudo ou nada"
//    — só existe 1 categoria real hoje (analytics, via GTM/GA4). Essencial
//    (sessão/auth) nunca precisa de consentimento (art. 7, VI), não é um
//    toggle.
// 2. Registro de consentimento precisa de timestamp + versão do documento +
//    canal, não só um valor booleano solto.
export const PRIVACY_POLICY_VERSION = '2026-08-15'

export interface ConsentCategories {
  analytics: boolean
}

export interface ConsentRecord {
  version: string
  timestamp: string
  channel: 'banner' | 'preferences'
  categories: ConsentCategories
}

interface ConsentContextValue {
  consent: ConsentRecord | null
  isBannerOpen: boolean
  hasAnalyticsConsent: boolean
  saveConsent: (categories: ConsentCategories, channel: ConsentRecord['channel']) => void
  reopen: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem } = useSecureStorage()
  const [consent, setConsent] = useState<ConsentRecord | null>(() => getItem<ConsentRecord>('cookie-consent', null))
  const [forceOpen, setForceOpen] = useState(false)

  const saveConsent = (categories: ConsentCategories, channel: ConsentRecord['channel']) => {
    // Se analytics estava ligado antes e a pessoa está desligando agora, só
    // atualizar o state não basta — o script do GTM já rodou, já setou
    // cookie do lado do Google. Precisa de reload pra garantir que a tag não
    // volta a rodar (mesmo princípio já validado quando isso era binário).
    const hadAnalyticsBefore = consent?.categories.analytics === true
    const record: ConsentRecord = {
      version: PRIVACY_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      channel,
      categories,
    }
    setConsent(record)
    setItem('cookie-consent', record)
    setForceOpen(false)
    if (hadAnalyticsBefore && !categories.analytics) window.location.reload()
  }

  const reopen = () => setForceOpen(true)

  return (
    <ConsentContext.Provider
      value={{
        consent,
        isBannerOpen: consent === null || forceOpen,
        hasAnalyticsConsent: consent?.categories.analytics === true,
        saveConsent,
        reopen,
      }}
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
