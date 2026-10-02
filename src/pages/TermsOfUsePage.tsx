// RASCUNHO — revisar com jurídico antes de considerar definitivo (marcadores [..] pendentes)
import { LegalSection } from '@/components/common/LegalSection'
import { useBusinessInfo } from '@/features/site-settings/hooks'
import { useSeoMeta } from '@/lib/seo'

import { getTermsSections } from './terms/termsSections'

export function TermsOfUsePage() {
  const business = useBusinessInfo()

  useSeoMeta({
    title: 'Termos de Uso',
    description: 'Regras de uso do site e das compras na Jomar Tecidos e Enxovais.',
    path: '/termos-de-uso',
  })

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-md) px-6 py-16 md:px-12">
      <h1 className="text-navy-dark mb-3 font-serif text-3xl font-medium">Termos de Uso</h1>
      <p className="text-text-meta mb-10 text-xs">Última atualização: 2 de outubro de 2026</p>

      <div className="flex flex-col gap-10">
        {getTermsSections(business).map((section) => (
          <LegalSection key={section.title} title={section.title}>
            {section.content}
          </LegalSection>
        ))}
      </div>
    </main>
  )
}
