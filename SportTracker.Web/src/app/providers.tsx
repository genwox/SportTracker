import { IonApp, setupIonicReact } from '@ionic/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../api/auth'
import { InstallHint } from '../ui/InstallHint'
import { v6NavAnimation } from '../ui/v6Nav'

// Stacked pages push in 350 ms (V6) instead of Ionic's 540 ms, same iOS curve.
setupIonicReact({ mode: 'ios', navAnimation: v6NavAnimation })

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><AuthProvider><IonApp>{children}<InstallHint /></IonApp></AuthProvider></QueryClientProvider>
}
