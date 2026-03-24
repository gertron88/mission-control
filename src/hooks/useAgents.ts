/**
 * Agents React Query Hooks
 * 
 * Provides:
 * - useAgents: List all agents with capacity info
 * - useAgent: Get single agent details
 * - useAgentHeartbeat: Send heartbeat ping
 */

'use client'

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { queryKeys, LIST_REFETCH_INTERVAL } from '@/lib/query-client'
import { endpoints, Agent } from '@/lib/api'

/**
 * Hook for fetching all agents
 * 
 * Features:
 * - Automatic refetching every 60s
 * - Includes task assignment counts
 * - Includes latest heartbeat
 * - Trading config for trading agents
 */
export function useAgents(options?: {
  includeOffline?: boolean
}): UseQueryResult<Agent[], Error> {
  return useQuery({
    queryKey: queryKeys.agents.list(options || {}),
    queryFn: () => endpoints.agents.list(options),
    refetchInterval: LIST_REFETCH_INTERVAL,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching a single agent
 * 
 * Includes:
 * - Agent profile
 * - Heartbeat history
 * - Trading configuration
 * - Assigned task count
 */
export function useAgent(agentId: string): UseQueryResult<Agent, Error> {
  return useQuery({
    queryKey: queryKeys.agents.detail(agentId),
    queryFn: () => endpoints.agents.get(agentId),
    enabled: !!agentId,
    staleTime: 30000,
  })
}

/**
 * Hook for sending agent heartbeat
 * 
 * Updates agent status and refreshes agent data
 */
export function useAgentHeartbeat(): UseMutationResult<
  Agent,
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (agentId: string) => endpoints.agents.heartbeat(agentId),
    onSuccess: (_data, agentId) => {
      // Invalidate agent cache
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() })
    },
  })
}
