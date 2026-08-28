export interface SiteSettings {
  home_hero_eyebrow: string
  home_hero_title: string
  home_hero_subtitle: string
  home_hero_cta_label: string
  home_hero_image_url: string
  home_banner2_eyebrow: string
  home_banner2_title: string
  home_banner2_subtitle: string
  home_banner2_cta_label: string
  home_banner2_image_url: string
  category_image_linhos: string
  category_image_algodoes: string
  category_image_sedas: string
  category_image_aviamentos: string
  category_image_rendas: string
  footer_phone: string
  footer_phone_href: string
  footer_whatsapp_href: string
  footer_email: string
  footer_address: string
  footer_city: string
  footer_zip: string
  footer_hours: string
  footer_instagram_href: string
  free_shipping_threshold: string
  promobar_text_1: string
  promobar_text_2: string
  promobar_text_3: string
  // Número/bairro/CNPJ da origem pra geração de etiqueta real (Melhor Envio
  // Fase 2) — separados do footer_address (texto livre, não confiável pra
  // parsing automático). Ver melhor-envio-generate-label.
  origin_number: string
  origin_district: string
  origin_document: string
}

export type SiteSettingKey = keyof SiteSettings
