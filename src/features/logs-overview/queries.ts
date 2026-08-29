import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { adaptLog } from '@/features/audit/queries'
import { adaptErrorLog } from '@/features/error-logs/queries'
import type { UnifiedLogEntry } from './types'

export const ALL_KINDS = 'all'
export const LOGS_PAGE_SIZE = 20
// Cada tabela é buscada até esse teto (mais recentes primeiro), as duas
// listas são mescladas e ordenadas por data no client, e só então
// paginadas — não é paginação real no banco (cada tabela já tem a própria
// tela com .range() de verdade pra isso), é uma janela recente o bastante
// pra uma visão combinada fazer sentido sem virar N+1 de página.
const RECENT_LIMIT = 150

export interface UnifiedLogFilters {
  kind: 'all' | 'activity' | 'error'
  search: string
  dateFrom: string
  dateTo: string
}

// Campos que de fato precisam de uma consulta nova ao banco. "search" fica de
// fora de propósito — filtra em memória sobre o resultado já buscado (ver
// useUnifiedLogs) — incluí-lo na key/queryFn faria cada tecla digitada
// refazer a busca inteira nas duas tabelas (até 300 linhas com blob de
// diff JSON) só pra filtrar depois algo que já estava na resposta anterior.
export type UnifiedLogQueryFilters = Omit<UnifiedLogFilters, 'search'>

// Colunas explícitas, sem `select('*')` — activity_logs tem `ip_address`,
// que nenhum lugar do app lê (nem ActivityLog/adaptLog); error_logs já usa
// as 10 colunas, mas listar protege contra bloat silencioso se o schema
// ganhar coluna nova amanhã.
const ACTIVITY_LOG_COLUMNS =
  'id, user_id, user_email, action, entity, entity_id, data_before, data_after, status, error_message, details, created_at'
const ERROR_LOG_COLUMNS =
  'id, user_id, user_email, message, stack, source, url, user_agent, context, created_at'

export const unifiedLogsQueryOptions = (filters: UnifiedLogQueryFilters) =>
  queryOptions({
    queryKey: ['unified-logs', filters] as const,
    queryFn: async (): Promise<UnifiedLogEntry[]> => {
      const tasks: Promise<UnifiedLogEntry[]>[] = []

      if (filters.kind !== 'error') {
        tasks.push(
          (async () => {
            let query = supabase
              .from('activity_logs')
              .select(ACTIVITY_LOG_COLUMNS)
              .order('created_at', { ascending: false })
              .limit(RECENT_LIMIT)
            if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
            if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
            const { data, error } = await query
            if (error) throw new Error(error.message)
            return (data ?? []).map((row) => {
              const log = adaptLog(row)
              return {
                kind: 'activity' as const,
                id: log.id,
                createdAt: log.createdAt,
                userEmail: log.userEmail,
                raw: log,
              }
            })
          })(),
        )
      }

      if (filters.kind !== 'activity') {
        tasks.push(
          (async () => {
            let query = supabase
              .from('error_logs')
              .select(ERROR_LOG_COLUMNS)
              .order('created_at', { ascending: false })
              .limit(RECENT_LIMIT)
            if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
            if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
            const { data, error } = await query
            if (error) throw new Error(error.message)
            return (data ?? []).map((row) => {
              const log = adaptErrorLog(row)
              return {
                kind: 'error' as const,
                id: log.id,
                createdAt: log.createdAt,
                userEmail: log.userEmail,
                raw: log,
              }
            })
          })(),
        )
      }

      const merged = (await Promise.all(tasks)).flat()
      return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
  })
