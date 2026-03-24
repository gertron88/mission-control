/**
 * Projects React Query Hooks
 * 
 * Provides:
 * - useProjects: List all projects
 * - useProject: Get single project details
 * - useProjectDependencies: Get task dependencies for a project
 */

'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { queryKeys, LIST_REFETCH_INTERVAL } from '@/lib/query-client'
import { endpoints, Project, ProjectDependencies } from '@/lib/api'

/**
 * Hook for fetching all projects
 * 
 * Features:
 * - Automatic refetching every 60s
 * - Includes task counts and milestone counts
 * - Includes blocked/failed tasks
 */
export function useProjects(options?: {
  portfolioId?: string
  state?: string
}): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: queryKeys.projects.list(options || {}),
    queryFn: () => endpoints.projects.list(options),
    refetchInterval: LIST_REFETCH_INTERVAL,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching a single project
 * 
 * Features:
 * - Detailed project info
 * - Associated blocked/failed tasks
 * - Portfolio information
 */
export function useProject(projectId: string): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => endpoints.projects.get(projectId),
    enabled: !!projectId,
    staleTime: 60000,
  })
}

/**
 * Hook for fetching project dependencies
 * 
 * Returns:
 * - Tasks in the project
 * - Dependency graph
 * - Blocked tasks
 * - Ready tasks (dependencies met)
 */
export function useProjectDependencies(
  projectId: string
): UseQueryResult<ProjectDependencies, Error> {
  return useQuery({
    queryKey: queryKeys.projects.dependencies(projectId),
    queryFn: () => endpoints.projects.dependencies(projectId),
    enabled: !!projectId,
    staleTime: 30000,
  })
}
