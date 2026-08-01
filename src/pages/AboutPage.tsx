import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { BUSINESS } from '@/lib/constants'

export function AboutPage() {
  return (
    <main>
      <ImagePlaceholder colors={['#131047', '#1c1a5e']} className="flex h-[280px] items-center justify-center">
        <h1 className="font-serif text-[38px] font-medium text-white">Nossa história</h1>
      </ImagePlaceholder>

      <div className="mx-auto flex max-w-(--breakpoint-md) flex-col gap-5 px-6 py-16 md:px-12">
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
    </main>
  )
}
