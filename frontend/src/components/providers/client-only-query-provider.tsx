'use client'

import { useEffect, useState } from 'react'
import { QueryProviderMinimal } from '../../lib/react-query-minimal'

export function ClientOnlyQueryProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // During SSR and initial hydration, just render children without QueryProvider
  if (!isClient) {
    return <>{children}</>
  }

  // Only after client-side mount, use QueryProvider
  return <QueryProviderMinimal>{children}</QueryProviderMinimal>
}