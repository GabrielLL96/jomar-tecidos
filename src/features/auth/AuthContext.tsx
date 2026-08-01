import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSecureStorage } from '@/hooks/useSecureStorage'
import type { LoginInput } from './schema'

const AUTH_STORAGE_KEY = 'jomar:auth-user'

interface AuthUser {
  name: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (input: LoginInput) => void
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

  const login: AuthContextValue['login'] = ({ email }) => {
    const nextUser: AuthUser = { name: nameFromEmail(email), email }
    setUser(nextUser)
    setItem(AUTH_STORAGE_KEY, nextUser)
  }

  const logout = () => {
    setUser(null)
    removeItem(AUTH_STORAGE_KEY)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}
