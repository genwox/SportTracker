import { IonApp, setupIonicReact } from '@ionic/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

setupIonicReact({ mode: 'ios' })

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><IonApp>{children}</IonApp></QueryClientProvider>
}
