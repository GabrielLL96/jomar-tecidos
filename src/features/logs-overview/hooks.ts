import { useQuery } from '@tanstack/react-query'
import { unifiedLogsQueryOptions, type UnifiedLogFilters } from './queries'

export const useUnifiedLogs = (filters: UnifiedLogFilters) =>
  useQuery({ ...unifiedLogsQueryOptions(filters), placeholderData: (prev) => prev })
