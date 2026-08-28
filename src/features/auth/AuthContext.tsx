import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { LoginInput, SignupInput } from './schema'
import type { UserRole } from './types'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
}

interface UpdateProfileInput {
  name?: string
  email?: string
  phone?: string
  password?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<AuthUser>
  signup: (input: SignupInput) => Promise<{ requiresEmailConfirmation: boolean }>
  updateProfile: (patch: UpdateProfileInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone ?? undefined,
    role: data.role,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    // O Supabase Auth dispara onAuthStateChange de novo a cada revalidação de
    // sessão em segundo plano (ex.: TOKEN_REFRESHED, que acontece toda vez que
    // a aba recupera o foco — inclusive ao fechar uma popup de OAuth de outra
    // integração). Sem essa guarda, todo esse "piscar" de isLoading fazia
    // AdminLayout (`if (isLoading) return null`) desmontar o painel inteiro a
    // cada troca de foco, perdendo qualquer state local das páginas do admin
    // no meio do caminho. Loading só faz sentido na checagem INICIAL da
    // sessão (refresh de página) — eventos seguintes só atualizam o usuário.
    let hasLoadedOnce = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      if (!session?.user) {
        setUser(null)
        setIsLoading(false)
        hasLoadedOnce = true
        return
      }

      // log_login() e o update de last_login_at precisam rodar só quando a
      // sessão está de fato pronta no client — chamá-los logo após
      // signInWithPassword() (dentro de login(), abaixo) resolve auth.uid()
      // como null do lado do servidor às vezes (a propagação da sessão não é
      // síncrona com o resolve da promise). 'SIGNED_IN' só dispara em
      // sign-in novo de verdade (não em 'INITIAL_SESSION' de reload de
      // página nem em 'TOKEN_REFRESHED').
      //
      // `void builder` NÃO executa a query — os builders do supabase-js são
      // thenables preguiçosos, só disparam a request de verdade dentro do
      // próprio `.then()`. `void` só descarta o valor, nunca chama `.then`,
      // então a call nunca saía do papel (achado real: log_login() e este
      // update nunca geravam nenhuma request de rede, em sessão nenhuma —
      // por isso "Último login" sempre ficava "Nunca"). `.then(fn, fn)` no
      // lugar de `void` é o que de fato dispara, best-effort dos dois lados.
      if (_event === 'SIGNED_IN') {
        supabase.rpc('log_login').then(
          () => {},
          () => {},
        )
        supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(
            () => {},
            () => {},
          )
      }

      if (!hasLoadedOnce) setIsLoading(true)
      fetchProfile(session.user.id).then((profile) => {
        if (active) {
          setUser(profile)
          setIsLoading(false)
          hasLoadedOnce = true
        }
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login: AuthContextValue['login'] = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    // log_login() e o update de last_login_at rodam no listener
    // onAuthStateChange (evento 'SIGNED_IN'), não aqui — ver comentário lá.

    // Devolve o profile (com role) pro chamador decidir o redirect na hora —
    // não dá pra esperar o listener onAuthStateChange (assíncrono) resolver
    // isso a tempo, ele atualiza o context em paralelo, não em sequência
    // com este await.
    const profile = await fetchProfile(data.user.id)
    if (!profile) throw new Error('Não foi possível carregar o perfil')
    return profile
  }

  const signup: AuthContextValue['signup'] = async ({
    name,
    email,
    password,
    cpf,
    phone,
    street,
    city,
    state,
    zipCode,
  }) => {
    // cpf/phone/endereço vão em raw_user_meta_data, não como escrita direta
    // do client — o trigger handle_new_user() (security definer) é quem grava
    // em users/addresses, porque ele roda independente de já existir sessão
    // (confirmação de e-mail pendente não teria auth.uid() pro client escrever).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, cpf, phone, street, city, state, zip_code: zipCode } },
    })
    if (error) throw new Error(error.message)
    return { requiresEmailConfirmation: !data.session }
  }

  const updateProfile: AuthContextValue['updateProfile'] = async (patch) => {
    if (!user) return

    if (patch.email || patch.password) {
      const { error } = await supabase.auth.updateUser({
        ...(patch.email ? { email: patch.email } : {}),
        ...(patch.password ? { password: patch.password } : {}),
      })
      if (error) throw new Error(error.message)
    }

    if (patch.name !== undefined || patch.phone !== undefined) {
      const { error } = await supabase
        .from('users')
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
    }

    setUser({
      ...user,
      name: patch.name ?? user.name,
      email: patch.email ?? user.email,
      phone: patch.phone ?? user.phone,
    })
  }

  const logout: AuthContextValue['logout'] = async () => {
    // precisa rodar ANTES do signOut — log_logout() é security definer e lê
    // auth.uid() da sessão ainda ativa; depois do signOut não há JWT pra
    // atribuir o evento a ninguém. Best-effort, não bloqueia o logout.
    try {
      await supabase.rpc('log_logout')
    } catch {
      // ignora — não deve impedir o logout
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}
