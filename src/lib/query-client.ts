import { QueryClient } from '@tanstack/react-query'

/**
 * Default stale time for all queries (30 seconds)
 * Data remains fresh for this duration before being considered stale
 */
export const DEFAULT_STALE_TIME = 30 * 1000

/**
 * Default refetch interval for list queries (60 seconds)
 * Lists are refetched periodically to show updated data
 */
export const LIST_REFETCH_INTERVAL = 60 * 1000

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  retries: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
}

/**
 * Create and configure the React Query client
 * 
 * Features:
 * - 30s default stale time
 * - 60s refetch interval for lists
 * - Exponential backoff retry
 * - Optimistic update support
 * - Error normalization
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        retry: DEFAULT_RETRY_CONFIG.retries,
        retryDelay: DEFAULT_RETRY_CONFIG.retryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Global error handler
        meta: {
          errorMessage: 'Failed to load data',
        },
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

/**
 * Singleton query client instance for client-side usage
 * This ensures the same client is used across hot reloads in development
 */
let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient()
    }
    return browserQueryClient
  }
}

/**
 * Query key factories for type-safe cache management
 * 
 * Usage:
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
 * queryClient.setQueryData(queryKeys.tasks.detail(taskId), newData)
 */
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    dependencies: (id: string) => [...queryKeys.projects.detail(id), 'dependencies'] as const,
  },
  agents: {
    all: ['agents'] as const,
    lists: () => [...queryKeys.agents.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.agents.lists(), filters] as const,
    details: () => [...queryKeys.agents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.agents.details(), id] as const,
  },
  dispatch: {
    all: ['dispatch'] as const,
    status: () => [...queryKeys.dispatch.all, 'status'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
  },
  trading: {
    all: ['trading'] as const,
    positions: () => [...queryKeys.trading.all, 'positions'] as const,
    orders: () => [...queryKeys.trading.all, 'orders'] as const,
    pnl: () => [...queryKeys.trading.all, 'pnl'] as const,
  },
} as const
