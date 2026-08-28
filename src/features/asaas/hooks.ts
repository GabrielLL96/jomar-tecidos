import { useQuery } from '@tanstack/react-query'
import { asaasStatusQueryOptions, savedCardsQueryOptions } from './queries'

export const useAsaasStatus = () => useQuery(asaasStatusQueryOptions)
// enabled=false até o checkout confirmar que tem usuário logado — RLS já
// restringe a `user_id = auth.uid()`, mas evita a query em vão no instante
// antes do redirect pra /conta/entrar.
export const useSavedCards = (enabled = true) =>
  useQuery({ ...savedCardsQueryOptions, enabled })
