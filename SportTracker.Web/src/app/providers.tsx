import { IonApp, setupIonicReact } from '@ionic/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../api/auth'
import { ApiError } from '../api/client'
import { InstallHint } from '../ui/InstallHint'
import { v6NavAnimation } from '../ui/v6Nav'

// Stacked pages push in 350 ms (V6) instead of Ionic's 540 ms, same iOS curve.
setupIonicReact({ mode: 'ios', navAnimation: v6NavAnimation })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, refetchOnWindowFocus: true,
      // Two quick retries for a network or server hiccup (not for 4xx: the answer would be the same), then the error state.
      retry: (failures, error) => failures < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      retryDelay: attempt => Math.min(800 * 2 ** attempt, 3000),
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><AuthProvider><IonApp>{children}<InstallHint /></IonApp></AuthProvider></QueryClientProvider>
}
