import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'
import type { LoginInput, SignupInput } from './schema'

const AUTH_STORAGE_KEY = 'jomar:auth-user'

interface AuthUser {
  name: string
  email: string
  phone?: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (input: LoginInput) => void
  signup: (input: SignupInput) => void
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'phone'>>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function nameFromEmail(email: string) {
  const prefix = email.split('@')[0].replace(/[._-]+/g, ' ')
  return prefix.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { getItem, setItem, removeItem } = useSecureStorage()
  const [user, setUser] = useState<AuthUser | null>(() => getItem<AuthUser>(AUTH_STORAGE_KEY, null))

  const persist = (nextUser: AuthUser) => {
    setUser(nextUser)
    setItem(AUTH_STORAGE_KEY, nextUser)
  }

  const login: AuthContextValue['login'] = ({ email }) => {
    persist({ name: nameFromEmail(email), email })
  }

  const signup: AuthContextValue['signup'] = ({ name, email }) => {
    persist({ name, email })
  }

  const updateProfile: AuthContextValue['updateProfile'] = (patch) => {
    if (!user) return
    persist({ ...user, ...patch })
  }

  const logout = () => {
    setUser(null)
    removeItem(AUTH_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}
