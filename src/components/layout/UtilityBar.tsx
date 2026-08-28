import { useEffect, useState } from 'react'
import { useBusinessInfo, useSiteSettings } from '@/features/site-settings/hooks'

const ROTATION_INTERVAL_MS = 10_000

export function UtilityBar() {
  const business = useBusinessInfo()
  const { data: settings } = useSiteSettings()
  const [phraseIndex, setPhraseIndex] = useState(0)

  const phrases = [
    settings.promobar_text_1,
    settings.promobar_text_2,
    settings.promobar_text_3,
  ].filter(Boolean)

  useEffect(() => {
    if (phrases.length < 2) return
    const interval = setInterval(() => {
      setPhraseIndex((current) => (current + 1) % phrases.length)
    }, ROTATION_INTERVAL_MS)
    return () => clearInterval(interval)
    // reage só à quantidade de frases (não ao array em si, que é uma
    // referência nova a cada render) — senão o intervalo reiniciaria do
    // zero em todo re-render e nunca chegaria a trocar de frase de verdade.
  }, [phrases.length])

  return (
    <div className="bg-navy-dark grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-2 text-xs tracking-[0.04em] text-white/90 md:px-12">
      <span />
      <span key={phraseIndex} className="animate-in fade-in text-center duration-500">
        {phrases[phraseIndex % phrases.length] ?? ''}
      </span>
      <span className="hidden justify-self-end sm:inline">
        Tel. {business.phone} · {business.hours}
      </span>
    </div>
  )
}
