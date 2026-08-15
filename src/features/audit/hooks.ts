import { useQuery } from '@tanstack/react-query'
import { activityLogsQueryOptions, type ActivityLogFilters } from './queries'

export const useActivityLogs = (filters: ActivityLogFilters) =>
  useQuery({ ...activityLogsQueryOptions(filters), placeholderData: (prev) => prev })
