import { Link } from 'react-router-dom'
import { CreditCard, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Truck } from 'lucide-react'
import { TRUST_BADGES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { InstagramIcon } from '@/components/common/InstagramIcon'
import { useBusinessInfo } from '@/features/site-settings/hooks'
import { useConsent } from '@/features/consent/ConsentContext'

const TRUST_ICONS = [Truck, CreditCard, MessageCircle, ShieldCheck]

const inertLinkClass = 'text-[#c9c5e2]'

export function Footer() {
  const business = useBusinessInfo()
  const { reopen } = useConsent()
  return (
    <footer className="bg-navy-dark mt-auto text-[#c9c5e2]">
      <div className="mx-auto grid max-w-(--breakpoint-xl) grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4 md:px-12">
        <div>
          <div className="mb-4 font-serif text-base font-semibold text-white">Institucional</div>
          <div className="flex flex-col gap-2.5 text-sm">
            <Link to="/sobre" className={inertLinkClass}>
              Sobre Nós
            </Link>
            <span className={inertLinkClass}>Formas de Entrega</span>
            <span className={inertLinkClass}>Trocas e Devoluções</span>
            <span className={inertLinkClass}>Termos de Uso</span>
          </div>
        </div>

        <div>
          <div className="mb-4 font-serif text-base font-semibold text-white">Informações</div>
          <div className="flex flex-col gap-2.5 text-sm">
            <Link to="/tecidos?novidades=1" className={inertLinkClass}>
              Novidades
            </Link>
            <span className={inertLinkClass}>Política de Segurança</span>
            <span className={inertLinkClass}>Política de Privacidade</span>
            <button type="button" onClick={reopen} className={cn(inertLinkClass, 'cursor-pointer text-left')}>
              Preferências de Cookies
            </button>
            <Link to="/tecidos" className={inertLinkClass}>
              Todos os Tecidos
            </Link>
          </div>
        </div>

        <div>
          <div className="mb-4 font-serif text-base font-semibold text-white">Minha Conta</div>
          <div className="flex flex-col gap-2.5 text-sm">
            <Link to="/conta/entrar" className={inertLinkClass}>
              Entrar
            </Link>
            <Link to="/conta" className={inertLinkClass}>
              Minha Conta
            </Link>
            <Link to="/carrinho" className={inertLinkClass}>
              Meu Carrinho
            </Link>
            <Link to="/favoritos" className={inertLinkClass}>
              Favoritos
            </Link>
          </div>
        </div>

        <div>
          <div className="mb-4 font-serif text-base font-semibold text-white">Contato</div>
          <div className="mb-2.5 text-sm font-semibold text-white">{business.name}</div>
          <div className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              {business.city} · CEP {business.zip}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              {business.phone}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <span className="break-all">{business.email}</span>
            </span>
          </div>
          <div className="mt-4 flex gap-2.5">
            <a
              href={business.instagramHref}
              title="Instagram"
              className="flex size-9 items-center justify-center rounded-full border border-[#3a3785]"
            >
              <InstagramIcon className="size-[17px]" />
            </a>
            <a
              href={business.whatsappHref}
              title="WhatsApp"
              className="flex size-9 items-center justify-center rounded-full border border-[#3a3785]"
            >
              <MessageCircle className="size-[17px]" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-(--breakpoint-xl) grid-cols-2 gap-6 border-t border-[#2a2778] px-6 py-6 text-center md:grid-cols-4 md:px-12">
        {TRUST_BADGES.map((badge, index) => {
          const Icon = TRUST_ICONS[index]
          return (
            <div key={badge.title}>
              <div className="flex items-center justify-center gap-1.5 text-sm text-white">
                <Icon className="size-4" />
                {badge.title}
              </div>
              <div className="mt-1 text-xs text-[#8b86b8]">{badge.subtitle}</div>
            </div>
          )
        })}
      </div>

      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-wrap items-center justify-between gap-3 border-t border-[#2a2778] px-6 py-5 text-xs text-[#8b86b8] md:px-12">
        <span>© {new Date().getFullYear()} {business.name}. Todos os direitos reservados.</span>
        <span className="tracking-[0.04em]">
          SITE DESENVOLVIDO POR: <strong className="text-[#c9c5e2]">GPM Grupo Pedro Matos Tecnologia</strong>
        </span>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-[#8b86b8]"
        >
          ↑ Voltar ao topo
        </button>
      </div>
    </footer>
  )
}
