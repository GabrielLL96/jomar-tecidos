import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/lib/database.types'
import { useAsaasStatus } from '@/features/asaas/hooks'
import { ASAAS_SETTINGS_ID } from '@/features/asaas/queries'
import { validateAsaasConnection } from '@/features/asaas/service'
import type { AsaasEnvironment } from '@/features/asaas/types'
import { SettingsCard } from './SettingsCard'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`

export function AsaasIntegrationCard() {
  const queryClient = useQueryClient()
  const { data: status } = useAsaasStatus()
  const [environment, setEnvironment] = useState<AsaasEnvironment>('sandbox')
  const [apiKey, setApiKey] = useState('')
  const [webhookToken, setWebhookToken] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const syncedStatus = useRef(false)

  useEffect(() => {
    if (syncedStatus.current || !status) return
    syncedStatus.current = true
    setEnvironment(status.environment)
  }, [status])

  const handleGenerateWebhookToken = () => {
    // Asaas passou a exigir tokens de webhook fortes/imprevisíveis — um UUID
    // v4 já atende isso sem depender de nenhuma lib nova.
    setWebhookToken(crypto.randomUUID())
  }

  const handleSaveAndTest = async () => {
    setIsSaving(true)
    setConnectError(null)
    try {
      // UPDATE puro, nunca upsert — mesmo raciocínio já documentado no card
      // da Melhor Envio: a linha singleton já é semeada por migration.
      const payload: TablesUpdate<'asaas_settings'> = { environment }
      // api_key/webhook_token só entram se o admin digitou um valor novo —
      // os campos sempre nascem vazios (GRANT nunca devolve o valor salvo),
      // então mandar string vazia aqui apagaria um secret já configurado.
      if (apiKey.trim()) payload.api_key = apiKey.trim()
      if (webhookToken.trim()) payload.webhook_token = webhookToken.trim()

      const { error } = await supabase
        .from('asaas_settings')
        .update(payload)
        .eq('id', ASAAS_SETTINGS_ID)
      if (error) throw new Error(error.message)
      setApiKey('')
      setWebhookToken('')

      await validateAsaasConnection()
      await queryClient.invalidateQueries({ queryKey: ['asaas', 'status'] })
      toast.success('Conectado com sucesso')
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Não foi possível conectar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsCard title="Asaas (pagamentos)">
      <div>
        <div className="text-navy-dark text-sm font-semibold">Asaas — gateway de pagamento</div>
        <p className="text-text-meta mt-1 text-xs">
          {status?.connectedAt
            ? `Conectado em ${dateTimeFormatter.format(new Date(status.connectedAt))}`
            : 'Não conectado'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Ambiente</Label>
          <Select
            value={environment}
            onValueChange={(value) => setEnvironment(value as AsaasEnvironment)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>API Key</Label>
            {status?.apiKeyConfigured && (
              <span className="text-[11px] font-semibold text-[#1e7a44]">✓ Configurado</span>
            )}
          </div>
          <Input
            type="password"
            placeholder={
              status?.apiKeyConfigured
                ? '•••• já configurado — digite pra substituir'
                : '$aact_hmlg_...'
            }
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Token do webhook</Label>
            {status?.webhookTokenConfigured && (
              <span className="text-[11px] font-semibold text-[#1e7a44]">✓ Configurado</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={
                status?.webhookTokenConfigured
                  ? '•••• já configurado — digite ou gere pra substituir'
                  : ''
              }
              value={webhookToken}
              onChange={(event) => setWebhookToken(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleGenerateWebhookToken}>
              Gerar token
            </Button>
          </div>
          <p className="text-text-meta text-xs">
            Cadastre esse MESMO valor no painel da Asaas (Configurações {'>'} Integrações {'>'}{' '}
            Webhooks) — nunca use a API key aqui.
          </p>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>URL do webhook</Label>
          <Input value={WEBHOOK_URL} readOnly onFocus={(event) => event.target.select()} />
          <p className="text-text-meta text-xs">
            Cadastre essa URL no painel da Asaas junto com o token acima. Só recebe eventos —
            nenhuma cobrança real é criada por este app ainda (fora do escopo desta fase).
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
