/**
 * Dispatch React Query Hooks
 * 
 * Provides:
 * - useDispatch: Trigger dispatch loop
 * - useDispatchStatus: Get current dispatch status
 */

'use client'

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { queryKeys, LIST_REFETCH_INTERVAL } from '@/lib/query-client'
import { endpoints, DispatchResult, DispatchStatus } from '@/lib/api'

/**
 * Hook for triggering the dispatch loop
 * 
 * Assigns ready tasks to available agents
 * Requires coordinator role
 */
export function useDispatch(): UseMutationResult<
  DispatchResult,
  Error,
  void,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: endpoints.dispatch.trigger,
    onSuccess: () => {
      // Invalidate related caches after dispatch
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.status() })
    },
  })
}

/**
 * Hook for getting dispatch status
 * 
 * Returns:
 * - Number of ready tasks
 * - Number of available agents
 * - Last updated timestamp
 */
export function useDispatchStatus(): UseQueryResult<DispatchStatus, Error> {
  return useQuery({
    queryKey: queryKeys.dispatch.status(),
    queryFn: endpoints.dispatch.status,
    refetchInterval: LIST_REFETCH_INTERVAL,
    staleTime: 15000,
  })
}
