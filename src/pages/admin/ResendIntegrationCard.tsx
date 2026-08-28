import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/lib/database.types'
import { useResendStatus } from '@/features/resend/hooks'
import { RESEND_SETTINGS_ID } from '@/features/resend/queries'
import { validateResendConnection } from '@/features/resend/service'
import { SettingsCard } from './SettingsCard'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function ResendIntegrationCard() {
  const queryClient = useQueryClient()
  const { data: status } = useResendStatus()
  const [apiKey, setApiKey] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [contactNotificationEmail, setContactNotificationEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const syncedStatus = useRef(false)

  useEffect(() => {
    if (syncedStatus.current || !status) return
    syncedStatus.current = true
    setFromEmail(status.fromEmail ?? '')
    setFromName(status.fromName ?? '')
    setContactNotificationEmail(status.contactNotificationEmail ?? '')
  }, [status])

  const handleSaveAndTest = async () => {
    setIsSaving(true)
    setConnectError(null)
    try {
      // UPDATE puro, nunca upsert — mesma lógica já usada nos cards de
      // Asaas/Melhor Envio: a linha singleton já é semeada por migration.
      const payload: TablesUpdate<'resend_settings'> = {
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        contact_notification_email: contactNotificationEmail.trim() || null,
      }
      // api_key só entra se o admin digitou um valor novo — o campo sempre
      // nasce vazio (GRANT nunca devolve o valor salvo), então mandar string
      // vazia aqui apagaria um secret já configurado.
      if (apiKey.trim()) payload.api_key = apiKey.trim()

      const { error } = await supabase
        .from('resend_settings')
        .update(payload)
        .eq('id', RESEND_SETTINGS_ID)
      if (error) throw new Error(error.message)
      setApiKey('')

      await validateResendConnection()
      await queryClient.invalidateQueries({ queryKey: ['resend', 'status'] })
      toast.success('Conectado com sucesso')
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Não foi possível conectar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsCard title="Resend (e-mail transacional)">
      <div>
        <div className="text-navy-dark text-sm font-semibold">
          Resend — confirmação de pedido, status e contato
        </div>
        <p className="text-text-meta mt-1 text-xs">
          {status?.connectedAt
            ? `Conectado em ${dateTimeFormatter.format(new Date(status.connectedAt))}`
            : 'Não conectado'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>API Key</Label>
            {status?.apiKeyConfigured && (
              <span className="text-[11px] font-semibold text-[#1e7a44]">✓ Configurado</span>
            )}
          </div>
          <Input
            type="password"
            placeholder={
              status?.apiKeyConfigured ? '•••• já configurado — digite pra substituir' : 're_...'
            }
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>E-mail remetente</Label>
            {status?.fromEmailConfigured && (
              <span className="text-[11px] font-semibold text-[#1e7a44]">✓ Configurado</span>
            )}
          </div>
          <Input
            placeholder="pedidos@jomartecidos.com.br"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
          />
          <p className="text-text-meta text-xs">
            Precisa ser de um domínio já verificado na sua conta Resend.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Nome do remetente</Label>
          <Input
            placeholder="Jomar Tecidos e Enxovais"
            value={fromName}
            onChange={(event) => setFromName(event.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>E-mail que recebe o formulário de contato</Label>
          <Input
            placeholder="contato@jomartecidos.com.br"
            value={contactNotificationEmail}
            onChange={(event) => setContactNotificationEmail(event.target.value)}
          />
          <p className="text-text-meta text-xs">
            Se deixar em branco, usa contato@jomartecidos.com.br como padrão.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button type="button" onClick={handleSaveAndTest} disabled={isSaving}>
            {isSaving ? 'Conectando…' : 'Salvar e testar conexão'}
          </Button>
        </div>
        {connectError && <p className="text-destructive text-xs">{connectError}</p>}
      </div>
    </SettingsCard>
  )
}
