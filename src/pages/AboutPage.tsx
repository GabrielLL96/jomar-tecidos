import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { BUSINESS } from '@/lib/constants'

const STATS = [
  { value: '38', label: 'anos de tradição' },
  { value: '500+', label: 'tecidos no catálogo' },
  { value: '12k', label: 'clientes atendidos' },
]

export function AboutPage() {
  return (
    <main>
      <ImagePlaceholder colors={['#131047', '#1c1a5e']} className="flex h-[280px] items-center justify-center">
        <h1 className="font-serif text-[38px] font-medium text-white">Nossa história</h1>
      </ImagePlaceholder>

      <div className="mx-auto flex max-w-(--breakpoint-md) flex-col gap-5 px-6 py-16 md:px-12">
        <p className="text-[16px] leading-relaxed text-[#3a352b]">
          Desde {BUSINESS.foundedYear}, a <strong>{BUSINESS.name}</strong> atende famílias e costureiras
          com uma seleção cuidadosa de tecidos nobres, aviamentos e enxovais. O que começou como uma
          pequena loja de bairro se tornou referência em tradição têxtil na região.
        </p>
        <p className="text-[16px] leading-relaxed text-[#3a352b]">
          Hoje, unimos o atendimento de perto que sempre nos definiu a uma vitrine digital pensada para
          quem valoriza qualidade, textura e acabamento — do corte à costura final.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-cream-secondary rounded-sm p-7 text-center">
              <div className="text-navy font-serif text-[34px] font-medium">{stat.value}</div>
              <div className="text-text-meta mt-1.5 text-[12.5px]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
