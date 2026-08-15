import { useQuery } from '@tanstack/react-query'
import { errorLogsQueryOptions, type ErrorLogFilters } from './queries'

export const useErrorLogs = (filters: ErrorLogFilters) =>
  useQuery({ ...errorLogsQueryOptions(filters), placeholderData: (prev) => prev })
