import { useQuery } from '@tanstack/react-query'
import { asaasStatusQueryOptions } from './queries'

export const useAsaasStatus = () => useQuery(asaasStatusQueryOptions)
