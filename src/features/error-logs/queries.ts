import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ErrorLog } from './types'

export const ERROR_LOGS_PAGE_SIZE = 20
export const ALL_SOURCES = 'all'

export interface ErrorLogFilters {
  page: number
  search: string
  source: string
  dateFrom: string
  dateTo: string
}

type ErrorLogRow = Database['public']['Tables']['error_logs']['Row']

export function adaptErrorLog(row: ErrorLogRow): ErrorLog {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    message: row.message,
    stack: row.stack,
    source: row.source,
    url: row.url,
    userAgent: row.user_agent,
    context: (row.context as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at,
  }
}

export const errorLogsQueryOptions = (filters: ErrorLogFilters) =>
  queryOptions({
    queryKey: ['error-logs', filters] as const,
    queryFn: async (): Promise<{ rows: ErrorLog[]; count: number }> => {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      const search = filters.search.trim()
      if (search) query = query.ilike('message', `%${search}%`)
      if (filters.source !== ALL_SOURCES) query = query.eq('source', filters.source)
      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)

      const from = filters.page * ERROR_LOGS_PAGE_SIZE
      const to = from + ERROR_LOGS_PAGE_SIZE - 1
      const { data, error, count } = await query.range(from, to)
      if (error) throw new Error(error.message)
      return { rows: (data ?? []).map(adaptErrorLog), count: count ?? 0 }
    },
  })
