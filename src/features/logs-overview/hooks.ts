import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { unifiedLogsQueryOptions, type UnifiedLogFilters } from './queries'
import type { UnifiedLogEntry } from './types'

function matchesSearch(entry: UnifiedLogEntry, search: string): boolean {
  const summary = entry.kind === 'activity' ? (entry.raw.details ?? '') : entry.raw.message
  return (
    (entry.userEmail?.toLowerCase().includes(search) ?? false) || summary.toLowerCase().includes(search)
  )
}

// "search" filtra em memória sobre o que já foi buscado, de propósito fora
// da query (ver comentário em queries.ts) — aqui é onde de fato se aplica,
// sem disparar rede a cada tecla.
export const useUnifiedLogs = (filters: UnifiedLogFilters) => {
  const { kind, dateFrom, dateTo, search } = filters
  const query = useQuery({
    ...unifiedLogsQueryOptions({ kind, dateFrom, dateTo }),
    placeholderData: (prev) => prev,
  })

  const trimmedSearch = search.trim().toLowerCase()
  const data = useMemo(() => {
    const entries = query.data ?? []
    return trimmedSearch ? entries.filter((entry) => matchesSearch(entry, trimmedSearch)) : entries
  }, [query.data, trimmedSearch])

  return { ...query, data }
}
