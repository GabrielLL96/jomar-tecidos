import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/lib/database.types'
import { useMelhorEnvioStatus } from '@/features/melhor-envio/hooks'
import { MELHOR_ENVIO_SETTINGS_ID } from '@/features/melhor-envio/queries'
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  MELHOR_ENVIO_OAUTH_MESSAGE_TYPE,
} from '@/features/melhor-envio/service'
import type { MelhorEnvioConnectResult } from '@/features/melhor-envio/types'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/melhor-envio-webhook`

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#e4ddd0] bg-white p-6">
      <h2 className="text-navy-dark mb-4 font-serif text-lg font-medium">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

export function MelhorEnvioIntegrationCard() {
  const queryClient = useQueryClient()
  const { data: status } = useMelhorEnvioStatus()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState(`${window.location.origin}/admin/melhor-envio/callback`)
  const [isSaving, setIsSaving] = useState(false)
  const [connectResult, setConnectResult] = useState<MelhorEnvioConnectResult | null>(null)
  const syncedStatus = useRef(false)
  const popupRef = useRef<Window | null>(null)
  // `state` gerado pro fluxo em andamento — comparado contra o que o popup
  // devolve via postMessage. Fica em memória (não sessionStorage): o popup é
  // uma janela separada, herdar sessionStorage do opener depois de navegar por
  // outra origem e voltar não é garantido em todo browser.
  const pendingStateRef = useRef<string | null>(null)

  useEffect(() => {
    if (syncedStatus.current || !status) return
    syncedStatus.current = true
    setClientId(status.clientId ?? '')
    setRedirectUri(status.redirectUri ?? `${window.location.origin}/admin/melhor-envio/callback`)
  }, [status])

  // OAuth roda numa janela popup (não navega a página atual) — o callback nela
  // repassa code/state crus pra cá via postMessage e se fecha sozinho. Esse
  // listener é o caso sancionado de useEffect: "subscribe pra updates de um
  // sistema externo, chamando setState num callback quando o estado externo
  // muda" — diferente de setState direto no corpo do effect.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== MELHOR_ENVIO_OAUTH_MESSAGE_TYPE) return
      popupRef.current?.close()

      const { code, state } = event.data as { code: string | null; state: string | null }
      if (!code || !state || state !== pendingStateRef.current) {
        setConnectResult({
          success: false,
          message: 'Retorno inválido da Melhor Envio (código ou state ausente/incorreto).',
        })
        return
      }

      exchangeAuthorizationCode(code)
        .then(() => {
          setConnectResult({ success: true })
          return queryClient.invalidateQueries({ queryKey: ['melhor-envio', 'status'] })
        })
        .catch((error: unknown) => {
          setConnectResult({
            success: false,
            message: error instanceof Error ? error.message : 'Falha ao concluir a conexão',
          })
        })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // UPDATE puro, nunca upsert: a linha singleton já é semeada por
      // migration (20260810130100) — upsert exigiria SELECT de tabela
      // inteira pra resolver o ON CONFLICT, o que devolveria client_secret
      // pro client. UPDATE não precisa de SELECT nenhum do chamador.
      const payload: TablesUpdate<'melhor_envio_settings'> = {
        client_id: clientId,
        redirect_uri: redirectUri,
      }
      // client_secret só entra se o admin digitou um valor novo — campo
      // sempre nasce vazio (GRANT nunca devolve o secret salvo), então
      // mandar string vazia aqui apagaria um secret já configurado.
      if (clientSecret.trim()) payload.client_secret = clientSecret.trim()

      const { error } = await supabase
        .from('melhor_envio_settings')
        .update(payload)
        .eq('id', MELHOR_ENVIO_SETTINGS_ID)
      if (error) throw new Error(error.message)
      setClientSecret('')
      await queryClient.invalidateQueries({ queryKey: ['melhor-envio', 'status'] })
      toast.success('Integração salva')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnect = () => {
    if (!clientId.trim() || !redirectUri.trim()) {
      toast.error('Preencha e salve client_id e redirect_uri antes de conectar')
      return
    }
    // Reaproveita o popup já aberto em vez de abrir um segundo (evita a corrida
    // de 2 `state` diferentes se o clique acontecer 2x).
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus()
      return
    }
    const { url, state } = buildAuthorizeUrl(clientId.trim(), redirectUri.trim())
    // Nome único por tentativa (não um nome fixo): um nome fixo deixa o browser
    // reaproveitar uma janela de OUTRA aba (ex.: se /admin/configuracoes estiver
    // aberto em 2 abas) — o `opener` dessa janela reaproveitada fica preso na
    // aba antiga, e a aba atual nunca recebe o postMessage de volta.
    const popup = window.open(url, `melhor-envio-oauth-${crypto.randomUUID()}`, 'width=520,height=680')
    if (!popup) {
      toast.error('Não foi possível abrir a janela de conexão — verifique o bloqueador de pop-ups')
      return
    }
    pendingStateRef.current = state
    popupRef.current = popup
  }

  return (
    <SettingsCard title="Integrações">
      <div>
        <div className="text-navy-dark text-sm font-semibold">Melhor Envio (sandbox)</div>
        <p className="text-text-meta mt-1 text-xs">
          {status?.connectedAt
            ? `Conectado em ${dateTimeFormatter.format(new Date(status.connectedAt))}`
            : 'Não conectado'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Client ID</Label>
          <Input value={clientId} onChange={(event) => setClientId(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Client Secret</Label>
            {status?.secretConfigured && (
              <span className="text-[11px] font-semibold text-[#1e7a44]">✓ Configurado</span>
            )}
          </div>
          <Input
            type="password"
            placeholder={status?.secretConfigured ? '•••• já configurado — digite pra substituir' : ''}
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>Redirect URI</Label>
          <Input value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} />
          <p className="text-text-meta text-xs">
            Precisa ser exatamente igual ao cadastrado no painel da Melhor Envio (Integrações {'>'} Área Dev.)
          </p>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>URL do webhook</Label>
          <Input value={WEBHOOK_URL} readOnly onFocus={(event) => event.target.select()} />
          <p className="text-text-meta text-xs">
            Cadastre essa URL em Integrações {'>'} Área Dev. {'>'} Webhooks no painel da Melhor Envio pra
            receber atualizações de status de etiqueta em tempo real. Só recebe eventos de etiquetas
            geradas por este app — sem efeito enquanto nenhuma etiqueta é comprada (fora do escopo
            desta fase).
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handleSave} disabled={isSaving} variant="secondary">
          {isSaving ? 'Salvando…' : 'Salvar integração'}
        </Button>
        <Button type="button" onClick={handleConnect}>
          Conectar com Melhor Envio
        </Button>
      </div>

      <Dialog open={connectResult !== null} onOpenChange={(open) => !open && setConnectResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {connectResult?.success ? 'Conectado com sucesso' : 'Não foi possível conectar'}
            </DialogTitle>
          </DialogHeader>
          {connectResult && !connectResult.success && (
            <p className="text-text-meta text-sm">{connectResult.message}</p>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setConnectResult(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  )
}
