import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MELHOR_ENVIO_OAUTH_MESSAGE_TYPE } from '@/features/melhor-envio/service'

// window.opener não muda ao longo da vida da página — checagem síncrona no
// render, sem precisar de state/effect pra isso.
const hasOpener = typeof window !== 'undefined' && !!window.opener

export function AdminMelhorEnvioCallbackPage() {
  const [searchParams] = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !hasOpener) return
    started.current = true

    // Repassa code/state crus pra janela principal — ela é quem valida o state
    // (guardado em memória de quando gerou o link) e faz a troca pelo token.
    // Essa página só existe pra rodar dentro do popup e se fechar sozinha.
    //
    // targetOrigin '*': window.location.origin AQUI seria a origem do PRÓPRIO
    // popup (ex.: jomartecidos.com.br, porque é o redirect_uri cadastrado na
    // Melhor Envio), não a da janela que abriu o popup — em dev local (opener
    // em localhost:5173) as origens divergem e um targetOrigin estrito faria o
    // browser recusar a entrega. A checagem de segurança real já é feita do
    // lado de quem recebe (event.origin === window.location.origin lá).
    window.opener.postMessage(
      {
        type: MELHOR_ENVIO_OAUTH_MESSAGE_TYPE,
        code: searchParams.get('code'),
        state: searchParams.get('state'),
      },
      '*',
    )
    window.close()
  }, [searchParams])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      {hasOpener ? (
        <p className="text-text-meta text-sm">Concluindo conexão com a Melhor Envio…</p>
      ) : (
        <p className="text-destructive text-sm font-semibold">
          Não foi possível voltar pra janela original. Feche esta janela e tente conectar de novo.
        </p>
      )}
    </div>
  )
}
