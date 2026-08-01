import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { BUSINESS } from '@/lib/constants'

export function AboutPage() {
  return (
    <main>
      <ImagePlaceholder colors={['#131047', '#1c1a5e']} className="flex h-[280px] items-center justify-center">
        <h1 className="font-serif text-[38px] font-medium text-white">Nossa história</h1>
      </ImagePlaceholder>

      <div className="grid grid-cols-1 items-stretch gap-6 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_minmax(0,5fr)] md:gap-6">
        <ImagePlaceholder colors={['#f0e6d4', '#e3d5b8']} className="h-56 w-full md:h-auto" />

        <div className="mx-auto flex w-full max-w-(--breakpoint-sm) flex-col gap-5 px-6 md:px-8">
          <p className="text-[16px] leading-relaxed text-[#3a352b]">
            A <strong>{BUSINESS.name}</strong> é uma loja especializada em tecidos finos e enxovais de
            qualidade, localizada em Minas Gerais. Com tradição no mercado têxtil, oferecemos uma vasta
            seleção de tecidos nacionais e importados para todos os gostos e necessidades.
          </p>
          <p className="text-[16px] leading-relaxed text-[#3a352b]">
            Nosso compromisso é proporcionar a melhor experiência de compra, com atendimento
            personalizado e produtos que superam expectativas. Cada tecido é cuidadosamente selecionado
            para garantir qualidade, durabilidade e beleza.
          </p>
          <p className="text-[16px] leading-relaxed text-[#3a352b]">
            Atendemos costureiras, estilistas, decoradores, ateliês e todos que buscam tecidos de
            excelência para seus projetos especiais.
          </p>
        </div>

        <ImagePlaceholder colors={['#e9e2d2', '#ded4bb']} className="h-56 w-full md:h-auto" />
      </div>
    </main>
  )
}
