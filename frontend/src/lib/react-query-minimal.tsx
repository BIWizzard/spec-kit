'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProviderMinimal({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry on 404s
          if ((error as any)?.status === 404) return false
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ReactQueryDevtools removed - might be causing webpack error */}
    </QueryClientProvider>
  )
}