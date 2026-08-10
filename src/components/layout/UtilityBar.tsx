import { useBusinessInfo, useSiteSettings } from '@/features/site-settings/hooks'

export function UtilityBar() {
  const business = useBusinessInfo()
  const { data: settings } = useSiteSettings()
  return (
    <div className="bg-navy-dark grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-2 text-xs tracking-[0.04em] text-white/90 md:px-12">
      <span />
      <span className="text-center">{settings.promobar_text}</span>
      <span className="hidden justify-self-end sm:inline">
        Tel. {business.phone} · {business.hours}
      </span>
    </div>
  )
}
