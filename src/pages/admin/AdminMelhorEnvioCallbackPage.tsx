import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { consumeStoredOAuthState, exchangeAuthorizationCode } from '@/features/melhor-envio/service'

type Status = 'processing' | 'success' | 'error'

export function AdminMelhorEnvioCallbackPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const started = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const expectedState = consumeStoredOAuthState()

      if (!code || !state || state !== expectedState) {
        setStatus('error')
        setErrorMessage('Retorno inválido da Melhor Envio (código ou state ausente/incorreto).')
        return
      }

      try {
        await exchangeAuthorizationCode(code)
        await queryClient.invalidateQueries({ queryKey: ['melhor-envio', 'status'] })
        setStatus('success')
      } catch (error) {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao concluir a conexão')
      }
    }

    void run()
    // mount-only: processa o callback uma única vez na entrada da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      {status === 'processing' && <p className="text-text-meta text-sm">Concluindo conexão com a Melhor Envio…</p>}
      {status === 'success' && (
        <>
          <p className="text-navy-dark text-sm font-semibold">Conectado com sucesso.</p>
          <Link to="/admin/configuracoes" className="text-navy text-sm hover:underline">
            Voltar para Configurações
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-destructive text-sm font-semibold">Não foi possível conectar.</p>
          <p className="text-text-meta text-xs">{errorMessage}</p>
          <Link to="/admin/configuracoes" className="text-navy text-sm hover:underline">
            Voltar para Configurações
          </Link>
        </>
      )}
    </div>
  )
}
