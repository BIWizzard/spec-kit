'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

// Dynamic import to avoid SSR issues with React Query
const DynamicQueryProvider = dynamic(
  () => import('@tanstack/react-query').then((mod) => {
    const { QueryClient, QueryClientProvider } = mod

    function QueryProvider({ children }: { children: ReactNode }) {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              if ((error as any)?.status === 404) return false
              return failureCount < 3
            },
          },
        },
      })

      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    return QueryProvider
  }),
  {
    ssr: false,
    loading: () => <div>Loading...</div>
  }
)

export function QueryProviderDynamic({ children }: { children: ReactNode }) {
  return <DynamicQueryProvider>{children}</DynamicQueryProvider>
}