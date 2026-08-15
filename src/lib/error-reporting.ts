import { supabase } from './supabase'
import type { Json } from './database.types'

const MAX_ERRORS_PER_SESSION = 20

const seen = new Set<string>()
let reportedCount = 0

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  return value.length > max ? value.slice(0, max) : value
}

type ErrorSource = 'window' | 'unhandledrejection' | 'react-error-boundary'

async function reportError(input: {
  message: string
  stack?: string
  source: ErrorSource
  context?: Record<string, unknown>
}) {
  // dedup + teto por sessão — um bug em loop (render infinito, retry sem
  // backoff) não pode afogar a tabela nem gerar centenas de inserts por
  // segundo. Só a primeira ocorrência de cada erro distinto é reportada.
  if (reportedCount >= MAX_ERRORS_PER_SESSION) return
  const key = `${input.source}:${input.message}:${input.stack?.slice(0, 200) ?? ''}`
  if (seen.has(key)) return
  seen.add(key)
  reportedCount++

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      message: truncate(input.message, 2000) ?? 'Erro sem mensagem',
      stack: truncate(input.stack, 8000),
      source: input.source,
      url: truncate(window.location.href, 2000),
      user_agent: truncate(navigator.userAgent, 500),
      context: (input.context as Json) ?? null,
    })
  } catch {
    // reportar erro não pode gerar outro erro — falha aqui é sempre silenciosa
  }
}

export function initErrorReporting() {
  window.addEventListener('error', (event) => {
    void reportError({
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      source: 'window',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as unknown
    void reportError({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    })
  })
}

export function reportBoundaryError(error: Error, componentStack: string) {
  void reportError({
    message: error.message,
    stack: error.stack,
    source: 'react-error-boundary',
    context: { componentStack: truncate(componentStack, 4000) },
  })
}
