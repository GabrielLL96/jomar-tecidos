import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BUSINESS } from '@/lib/constants'
import { DEFAULT_SITE_SETTINGS, siteSettingsQueryOptions } from './queries'
import type { SiteSettingKey } from './types'

export function useSiteSettings() {
  const query = useQuery({ ...siteSettingsQueryOptions, placeholderData: DEFAULT_SITE_SETTINGS })
  return { ...query, data: query.data ?? DEFAULT_SITE_SETTINGS }
}

export function useBusinessInfo() {
  const { data: settings } = useSiteSettings()
  return {
    name: BUSINESS.name,
    foundedYear: BUSINESS.foundedYear,
    phone: settings.footer_phone,
    phoneHref: settings.footer_phone_href,
    whatsappHref: settings.footer_whatsapp_href,
    email: settings.footer_email,
    address: settings.footer_address,
    city: settings.footer_city,
    zip: settings.footer_zip,
    hours: settings.footer_hours,
    freeShippingThreshold: BUSINESS.freeShippingThreshold,
    flatShippingFee: BUSINESS.flatShippingFee,
    instagramHref: settings.footer_instagram_href,
  }
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: SiteSettingKey; value: string }) => {
      const { error } = await supabase.from('site_settings').upsert({ key, value })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
    },
  })
}
