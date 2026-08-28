import { useQuery } from '@tanstack/react-query'
import {
  integrationLogsQueryOptions,
  integrationStatsQueryOptions,
  type IntegrationLogFilters,
} from './queries'

export const useIntegrationLogs = (filters: IntegrationLogFilters) =>
  useQuery({ ...integrationLogsQueryOptions(filters), placeholderData: (prev) => prev })

export const useIntegrationStats = () => useQuery(integrationStatsQueryOptions())
