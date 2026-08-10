import { useQuery } from '@tanstack/react-query'
import { melhorEnvioStatusQueryOptions } from './queries'

export const useMelhorEnvioStatus = () => useQuery(melhorEnvioStatusQueryOptions)
