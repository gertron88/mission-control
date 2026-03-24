/**
 * Tasks React Query Hooks
 * 
 * Provides:
 * - useTasks: List tasks with filtering and pagination
 * - useTask: Get single task details
 * - useCreateTask: Create new task (optimistic)
 * - useUpdateTask: Update task (optimistic)
 * - useAssignTask: Auto-assign task
 * - useBlockTask: Block task with reason
 * - useUnblockTask: Unblock task
 */

'use client'

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { queryKeys, LIST_REFETCH_INTERVAL } from '@/lib/query-client'
import { endpoints, Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '@/lib/api'
import { TaskStatus } from '@prisma/client'

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching tasks list with filters
 * 
 * Features:
 * - Automatic refetching every 60s
 * - Pagination support
 * - Filter by status, project, assignee, etc.
 */
export function useTasks(filters: TaskFilters = {}): UseQueryResult<{
  tasks: Task[]
  meta: { page: number; limit: number; total: number; hasMore: boolean }
}, Error> {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => endpoints.tasks.list(filters),
    refetchInterval: LIST_REFETCH_INTERVAL,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching a single task
 */
export function useTask(taskId: string): UseQueryResult<Task, Error> {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => endpoints.tasks.get(taskId),
    enabled: !!taskId,
    staleTime: 60000,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for creating a new task
 * 
 * Features:
 * - Optimistic list invalidation
 * - Auto-refetch on success
 */
export function useCreateTask(): UseMutationResult<
  Task,
  Error,
  CreateTaskInput,
  { previousTasks: unknown }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: endpoints.tasks.create,
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists())

      // Return context for rollback
      return { previousTasks }
    },
    onError: (_err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.lists(), context.previousTasks)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
  })
}

/**
 * Hook for updating a task
 * 
 * Features:
 * - Optimistic updates (UI updates immediately)
 * - Rollback on error
 * - Cache synchronization
 */
export function useUpdateTask(): UseMutationResult<
  Task,
  Error,
  { id: string; data: UpdateTaskInput },
  { previousTask: Task | undefined; previousTasks: unknown }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => endpoints.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() })

      // Snapshot previous values
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))
      const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists())

      // Optimistically update the task detail
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), {
          ...previousTask,
          ...data,
        })
      }

      // Optimistically update in lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists() },
        (old: { tasks: Task[]; meta: unknown } | undefined) => {
          if (!old) return old
          return {
            ...old,
            tasks: old.tasks.map((task) =>
              task.id === id ? { ...task, ...data } : task
            ),
          }
        }
      )

      return { previousTask, previousTasks }
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.lists(), context.previousTasks)
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Always refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
  })
}

/**
 * Hook for auto-assigning a task
 */
export function useAssignTask(): UseMutationResult<
  Task,
  Error,
  string,
  { previousTask: Task | undefined }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => endpoints.tasks.assign(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId))
      
      // Optimistically mark as assigning
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          status: 'ASSIGNED' as TaskStatus,
        })
      }
      
      return { previousTask }
    },
    onError: (_err, taskId, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask)
      }
    },
    onSettled: (_data, _error, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
  })
}

/**
 * Hook for blocking a task
 */
export function useBlockTask(): UseMutationResult<
  Task,
  Error,
  { id: string; blockerType: string; blockerReason: string },
  { previousTask: Task | undefined }
003e {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, blockerType, blockerReason }) =>
      endpoints.tasks.block(id, { blockerType, blockerReason }),
    onMutate: async ({ id, blockerType, blockerReason }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))
      
      // Optimistically mark as blocked
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), {
          ...previousTask,
          status: 'BLOCKED' as TaskStatus,
          blockerType,
          blockerReason,
        })
      }
      
      return { previousTask }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask)
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
  })
}

/**
 * Hook for unblocking a task
 */
export function useUnblockTask(): UseMutationResult<
  Task,
  Error,
  string,
  { previousTask: Task | undefined }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => endpoints.tasks.unblock(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId))
      
      // Optimistically mark as ready
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          status: 'READY' as TaskStatus,
          blockerType: null,
          blockerReason: null,
        })
      }
      
      return { previousTask }
    },
    onError: (_err, taskId, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask)
      }
    },
    onSettled: (_data, _error, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
  })
}
