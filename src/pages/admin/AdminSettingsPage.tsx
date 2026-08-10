import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploadField } from '@/components/common/ImageUploadField'
import { MelhorEnvioIntegrationCard } from './MelhorEnvioIntegrationCard'
import { supabase } from '@/lib/supabase'
import { CATEGORY_DISPLAY } from '@/features/catalog/data'
import { useSiteSettings } from '@/features/site-settings/hooks'
import type { SiteSettings } from '@/features/site-settings/types'

const CATEGORY_SLUGS = Object.keys(CATEGORY_DISPLAY) as (keyof typeof CATEGORY_DISPLAY)[]

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#e4ddd0] bg-white p-6">
      <h2 className="text-navy-dark mb-4 font-serif text-lg font-medium">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

export function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings, isPlaceholderData } = useSiteSettings()
  const [form, setForm] = useState<SiteSettings>(settings)
  const [isSaving, setIsSaving] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current || isPlaceholderData) return
    hydrated.current = true
    setForm(settings)
  }, [settings, isPlaceholderData])

  const setField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const rows = Object.entries(form).map(([key, value]) => ({ key, value }))
      const { error } = await supabase.from('site_settings').upsert(rows)
      if (error) throw new Error(error.message)
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('Configurações salvas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Hero da Home">
        <div className="flex flex-col gap-1.5">
          <Label>Imagem</Label>
          <ImageUploadField
            bucket="site-images"
            pathPrefix="home-hero"
            value={form.home_hero_image_url}
            onChange={(url) => setField('home_hero_image_url', url)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Texto de apoio (acima do título)</Label>
          <Input
            value={form.home_hero_eyebrow}
            onChange={(event) => setField('home_hero_eyebrow', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Título</Label>
          <Input
            value={form.home_hero_title}
            onChange={(event) => setField('home_hero_title', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Subtítulo</Label>
          <Textarea
            rows={3}
            value={form.home_hero_subtitle}
            onChange={(event) => setField('home_hero_subtitle', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Texto do botão</Label>
          <Input
            value={form.home_hero_cta_label}
            onChange={(event) => setField('home_hero_cta_label', event.target.value)}
          />
        </div>
      </SettingsCard>

      <SettingsCard title='Banner "Sob medida"'>
        <div className="flex flex-col gap-1.5">
          <Label>Imagem</Label>
          <ImageUploadField
            bucket="site-images"
            pathPrefix="home-banner2"
            value={form.home_banner2_image_url}
            onChange={(url) => setField('home_banner2_image_url', url)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Texto de apoio</Label>
          <Input
            value={form.home_banner2_eyebrow}
            onChange={(event) => setField('home_banner2_eyebrow', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Título</Label>
          <Input
            value={form.home_banner2_title}
            onChange={(event) => setField('home_banner2_title', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Subtítulo</Label>
          <Textarea
            rows={3}
            value={form.home_banner2_subtitle}
            onChange={(event) => setField('home_banner2_subtitle', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Texto do link</Label>
          <Input
            value={form.home_banner2_cta_label}
            onChange={(event) => setField('home_banner2_cta_label', event.target.value)}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Imagens das categorias">
        {CATEGORY_SLUGS.map((slug) => {
          const key = `category_image_${slug}` as keyof SiteSettings
          return (
            <div key={slug} className="flex flex-col gap-1.5">
              <Label>{CATEGORY_DISPLAY[slug].tag}</Label>
              <ImageUploadField
                bucket="site-images"
                pathPrefix={`category-${slug}`}
                value={form[key]}
                onChange={(url) => setField(key, url)}
              />
            </div>
          )
        })}
      </SettingsCard>

      <SettingsCard title="Rodapé e contato">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Telefone (exibição)</Label>
            <Input value={form.footer_phone} onChange={(event) => setField('footer_phone', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Telefone (link, só dígitos com DDI)</Label>
            <Input
              value={form.footer_phone_href}
              onChange={(event) => setField('footer_phone_href', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>WhatsApp (link completo)</Label>
            <Input
              value={form.footer_whatsapp_href}
              onChange={(event) => setField('footer_whatsapp_href', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>E-mail</Label>
            <Input value={form.footer_email} onChange={(event) => setField('footer_email', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Endereço</Label>
            <Input
              value={form.footer_address}
              onChange={(event) => setField('footer_address', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cidade/UF</Label>
            <Input value={form.footer_city} onChange={(event) => setField('footer_city', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>CEP</Label>
            <Input value={form.footer_zip} onChange={(event) => setField('footer_zip', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Horário de funcionamento</Label>
            <Input value={form.footer_hours} onChange={(event) => setField('footer_hours', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Instagram (link)</Label>
            <Input
              value={form.footer_instagram_href}
              onChange={(event) => setField('footer_instagram_href', event.target.value)}
            />
          </div>
        </div>
      </SettingsCard>

      <MelhorEnvioIntegrationCard />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  )
}
