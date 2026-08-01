import { MessageCircle } from 'lucide-react'
import { BUSINESS } from '@/lib/constants'

export function WhatsAppButton() {
  return (
    <a
      href={BUSINESS.whatsappHref}
      title="Fale conosco no WhatsApp"
      target="_blank"
      rel="noreferrer"
      className="fixed right-7 bottom-7 z-50 flex size-[58px] items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg"
    >
      <MessageCircle className="size-7" />
    </a>
  )
}
