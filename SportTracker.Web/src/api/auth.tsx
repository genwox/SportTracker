import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from './client'
import { clearToken, getToken, subscribeAuthChange } from './tokenStore'

interface AuthContextValue {
  authenticated: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [authenticated, setAuthenticated] = useState(() => Boolean(getToken()))

  useEffect(() => subscribeAuthChange(() => setAuthenticated(Boolean(getToken()))), [])
  useEffect(() => {
    setUnauthorizedHandler(() => queryClient.clear())
    return () => setUnauthorizedHandler(undefined)
  }, [queryClient])

  const logout = () => {
    clearToken()
    queryClient.clear()
  }

  return <AuthContext.Provider value={{ authenticated, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
