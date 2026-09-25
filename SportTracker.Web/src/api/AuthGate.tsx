import type { ReactNode } from 'react'
import { Redirect, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { getToken } from './tokenStore'

export function AuthGate({ children }: { children: ReactNode }) {
  useAuth() // subscribe to login/logout so the guard rerenders
  const location = useLocation()
  const protectedPath = location.pathname === '/tabs' || location.pathname.startsWith('/tabs/') || location.pathname === '/live' || location.pathname.startsWith('/live/')
  if (!protectedPath) return <>{children}</>
  if (getToken()) return <>{children}</>
  const returnUrl = location.pathname + location.search + location.hash
  return <Redirect to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} />
}
