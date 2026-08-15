import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { IntegrationLog } from './types'

export const INTEGRATION_LOGS_PAGE_SIZE = 20
export const ALL_FILTER = 'all'

export interface IntegrationLogFilters {
  page: number
  integration: string
  status: string
  environment: string
  operation: string
  dateFrom: string
  dateTo: string
}

type IntegrationLogRow = Database['public']['Tables']['integration_logs']['Row']

function adaptIntegrationLog(row: IntegrationLogRow): IntegrationLog {
  return {
    id: row.id,
    integration: row.integration,
    operation: row.operation,
    direction: row.direction,
    relatedEntity: row.related_entity,
    relatedEntityId: row.related_entity_id,
    requestSummary: (row.request_summary as Record<string, unknown> | null) ?? null,
    responseSummary: (row.response_summary as Record<string, unknown> | null) ?? null,
    statusHttp: row.status_http,
    status: row.status,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    environment: row.environment,
    createdAt: row.created_at,
  }
}

export const integrationLogsQueryOptions = (filters: IntegrationLogFilters) =>
  queryOptions({
    queryKey: ['integration-logs', filters] as const,
    queryFn: async (): Promise<{ rows: IntegrationLog[]; count: number }> => {
      let query = supabase
        .from('integration_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.integration !== ALL_FILTER) query = query.eq('integration', filters.integration)
      if (filters.status !== ALL_FILTER) query = query.eq('status', filters.status)
      if (filters.environment !== ALL_FILTER) query = query.eq('environment', filters.environment)
      if (filters.operation !== ALL_FILTER) query = query.eq('operation', filters.operation)
      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)

      const from = filters.page * INTEGRATION_LOGS_PAGE_SIZE
      const to = from + INTEGRATION_LOGS_PAGE_SIZE - 1
      const { data, error, count } = await query.range(from, to)
      if (error) throw new Error(error.message)
      return { rows: (data ?? []).map(adaptIntegrationLog), count: count ?? 0 }
    },
  })

export interface IntegrationStats {
  integration: string
  totalLast24h: number
  failureCountLast24h: number
  errorRatePct: number
  avgDurationMs: number | null
}

// Agregado client-side sobre uma janela de 24h — sem RPC/view dedicada de
// propósito, mesmo raciocínio YAGNI já usado no resto do projeto (ADR-009):
// feature nova, volume ainda baixo. Se crescer o suficiente pra pesar,
// promover pra uma view/RPC é o próximo passo natural, não construído agora.
export const integrationStatsQueryOptions = () =>
  queryOptions({
    queryKey: ['integration-logs', 'stats'] as const,
    queryFn: async (): Promise<IntegrationStats[]> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('integration_logs')
        .select('integration, status, duration_ms')
        .gte('created_at', since)
        .limit(2000)
      if (error) throw new Error(error.message)

      const byIntegration = new Map<string, { total: number; failures: number; durations: number[] }>()
      for (const row of data ?? []) {
        const entry = byIntegration.get(row.integration) ?? { total: 0, failures: 0, durations: [] }
        entry.total += 1
        if (row.status !== 'success') entry.failures += 1
        if (row.duration_ms != null) entry.durations.push(row.duration_ms)
        byIntegration.set(row.integration, entry)
      }

      return Array.from(byIntegration.entries()).map(([integration, entry]) => ({
        integration,
        totalLast24h: entry.total,
        failureCountLast24h: entry.failures,
        errorRatePct: entry.total > 0 ? Math.round((entry.failures / entry.total) * 1000) / 10 : 0,
        avgDurationMs:
          entry.durations.length > 0
            ? Math.round(entry.durations.reduce((sum, value) => sum + value, 0) / entry.durations.length)
            : null,
      }))
    },
    staleTime: 60_000,
  })
