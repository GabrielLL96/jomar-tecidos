import { useQuery } from '@tanstack/react-query'
import { resendStatusQueryOptions } from './queries'

export const useResendStatus = () => useQuery(resendStatusQueryOptions)
