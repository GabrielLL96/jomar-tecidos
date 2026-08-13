import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { consumeStoredOAuthState, exchangeAuthorizationCode } from '@/features/melhor-envio/service'
import type { MelhorEnvioConnectResult } from '@/features/melhor-envio/types'

export function AdminMelhorEnvioCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const started = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const expectedState = consumeStoredOAuthState()

      let result: MelhorEnvioConnectResult
      if (!code || !state || state !== expectedState) {
        result = {
          success: false,
          message: 'Retorno inválido da Melhor Envio (código ou state ausente/incorreto).',
        }
      } else {
        try {
          await exchangeAuthorizationCode(code)
          await queryClient.invalidateQueries({ queryKey: ['melhor-envio', 'status'] })
          result = { success: true }
        } catch (error) {
          result = {
            success: false,
            message: error instanceof Error ? error.message : 'Falha ao concluir a conexão',
          }
        }
      }

      // Volta pra Configurações — o resultado é exibido lá via modal
      // (state da navegação), não numa tela própria.
      navigate('/admin/configuracoes', { replace: true, state: { melhorEnvioResult: result } })
    }

    void run()
    // mount-only: processa o callback uma única vez na entrada da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <p className="text-text-meta text-sm">Concluindo conexão com a Melhor Envio…</p>
    </div>
  )
}
