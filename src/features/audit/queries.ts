import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ActivityLog } from './types'

export const LOGS_PAGE_SIZE = 20
export const ALL_FILTER = 'all'

export interface ActivityLogFilters {
  page: number
  search: string
  action: string
  entity: string
  status: string
  dateFrom: string
  dateTo: string
}

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row']

// Pick, não o Row inteiro -- deixa quem chama pedir só essas colunas ao
// banco (ex.: logs-overview/queries.ts, que evita `ip_address`/`user_agent`
// por não serem usadas em lugar nenhum) sem erro de tipo por faltar coluna
// que a função nunca lê de verdade.
type ActivityLogRowFields = Pick<
  ActivityLogRow,
  | 'id'
  | 'user_id'
  | 'user_email'
  | 'action'
  | 'entity'
  | 'entity_id'
  | 'data_before'
  | 'data_after'
  | 'status'
  | 'error_message'
  | 'details'
  | 'created_at'
>

export function adaptLog(row: ActivityLogRowFields): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    dataBefore: (row.data_before as Record<string, unknown> | null) ?? null,
    dataAfter: (row.data_after as Record<string, unknown> | null) ?? null,
    status: row.status,
    errorMessage: row.error_message,
    details: row.details,
    createdAt: row.created_at,
  }
}

export const activityLogsQueryOptions = (filters: ActivityLogFilters) =>
  queryOptions({
    queryKey: ['activity-logs', filters] as const,
    queryFn: async (): Promise<{ rows: ActivityLog[]; count: number }> => {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      const search = filters.search.trim()
      if (search) query = query.ilike('user_email', `%${search}%`)
      if (filters.action !== ALL_FILTER) query = query.eq('action', filters.action)
      if (filters.entity !== ALL_FILTER) query = query.eq('entity', filters.entity)
      if (filters.status !== ALL_FILTER) query = query.eq('status', filters.status)
      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)

      const from = filters.page * LOGS_PAGE_SIZE
      const to = from + LOGS_PAGE_SIZE - 1
      const { data, error, count } = await query.range(from, to)
      if (error) throw new Error(error.message)
      return { rows: (data ?? []).map(adaptLog), count: count ?? 0 }
    },
  })
