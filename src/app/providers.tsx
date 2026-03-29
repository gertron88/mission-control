'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState, lazy, Suspense } from 'react'
import { createQueryClient } from '@/lib/query-client'

// Dynamically import devtools only in development
const ReactQueryDevtools = process.env.NODE_ENV === 'development' 
  ? lazy(() => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })))
  : () => null

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient for each session to avoid shared state
  // between requests during SSR
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}