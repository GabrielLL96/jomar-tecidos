import { createClient } from '@supabase/supabase-js'
import { secureCookieStorage } from '@/lib/secureCookieStorage'
import type { Database } from '@/lib/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureCookieStorage,
      persistSession: true,
      autoRefreshToken: true,
      // true: obrigatório pro link de "esqueci minha senha" (e magic
      // link/convite) funcionar — sem isso o client nunca troca o
      // code/token da URL por uma sessão de recovery de verdade.
      detectSessionInUrl: true,
    },
  },
)
