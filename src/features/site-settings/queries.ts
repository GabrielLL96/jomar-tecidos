import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BUSINESS } from '@/lib/constants'
import { formatPriceBRL } from '@/lib/format'
import type { SiteSettings } from './types'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  home_hero_eyebrow: 'Tradição têxtil mineira',
  home_hero_title: 'Tecidos nobres para quem tece histórias.',
  home_hero_subtitle:
    'Uma curadoria de linhos, algodões, sedas e aviamentos premium — da vitrine física ao seu ateliê, com o mesmo cuidado artesanal de sempre.',
  home_hero_cta_label: 'Ver coleção',
  home_hero_image_url: '',
  home_banner2_eyebrow: 'Sob medida',
  home_banner2_title: 'Enxovais e aviamentos para todo projeto',
  home_banner2_subtitle:
    'Da linha de cama, mesa e banho aos aviamentos de costura — botões, zíperes, rendas e vieses selecionados para durar.',
  home_banner2_cta_label: 'Explorar enxovais',
  home_banner2_image_url: '',
  category_image_linhos: '',
  category_image_algodoes: '',
  category_image_sedas: '',
  category_image_aviamentos: '',
  category_image_rendas: '',
  footer_phone: BUSINESS.phone,
  footer_phone_href: BUSINESS.phoneHref,
  footer_whatsapp_href: BUSINESS.whatsappHref,
  footer_email: BUSINESS.email,
  footer_address: BUSINESS.address,
  footer_city: BUSINESS.city,
  footer_zip: BUSINESS.zip,
  footer_hours: BUSINESS.hours,
  footer_instagram_href: BUSINESS.instagramHref,
  free_shipping_threshold: String(BUSINESS.freeShippingThreshold),
  promobar_text_1: `Frete grátis para compras acima de ${formatPriceBRL(BUSINESS.freeShippingThreshold)}`,
  promobar_text_2: '',
  promobar_text_3: '',
}

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ['site-settings'] as const,
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase.from('site_settings').select('key, value')
    if (error) throw new Error(error.message)
    const overrides = Object.fromEntries(data.map((row) => [row.key, row.value]))
    return { ...DEFAULT_SITE_SETTINGS, ...overrides }
  },
  staleTime: 60 * 1000,
})
