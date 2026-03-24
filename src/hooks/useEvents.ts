/**
 * Events / SSE React Query Hooks
 * 
 * Provides:
 * - useEventSource: Connect to SSE endpoint
 * - useEvents: Real-time event handling with React Query integration
 * - useEventSubscription: Subscribe to specific event types
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { endpoints, DomainEvent } from '@/lib/api'
import { TaskStatus } from '@prisma/client'

/**
 * Connection status type
 */
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Hook for connecting to the SSE event stream
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Event parsing and filtering
 */
export function useEventSource() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_BASE_DELAY = 1000

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return

    setStatus('connecting')
    setError(null)

    try {
      const es = new EventSource(endpoints.events.stream)
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus('connected')
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      es.onmessage = (event) => {
        try {
          // Handle keepalive messages
          if (event.data.startsWith(':keepalive') || event.data.trim() === '') {
            return
          }

          const parsedEvent: DomainEvent = JSON.parse(event.data)
          
          // Handle connection message
          if (parsedEvent.type === 'CONNECTED') {
            return
          }

          setLastEvent(parsedEvent)
        } catch (err) {
          console.warn('Failed to parse SSE event:', event.data)
        }
      }

      es.onerror = () => {
        setStatus('error')
        es.close()
        eventSourceRef.current = null

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            30000 // Max 30 seconds
          )
          reconnectAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          setError(new Error('Max reconnection attempts reached'))
          setStatus('disconnected')
        }
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err : new Error('Failed to connect'))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus('disconnected')
    reconnectAttemptsRef.current = 0
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    status,
    lastEvent,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
  }
}

/**
 * Hook for handling events and updating React Query cache
 * 
 * Automatically updates cache when domain events are received
 */
export function useEvents() {
  const { status, lastEvent, error, isConnected } = useEventSource()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!lastEvent) return

    // Handle different event types
    switch (lastEvent.type) {
      case 'TASK_CREATED':
        // Invalidate task lists
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        break

      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED': {
        const payload = lastEvent.payload as { taskId: string; newStatus?: string }
        // Update specific task
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(payload.taskId),
        })
        // Update task lists
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        // Update agent data
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() })
        break
      }

      case 'TASK_BLOCKED': {
        const payload = lastEvent.payload as { taskId: string }
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(payload.taskId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() })
        break
      }

      case 'TASK_UNBLOCKED': {
        const payload = lastEvent.payload as { taskId: string }
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(payload.taskId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() })
        break
      }

      case 'DEPENDENCY_RESOLVED': {
        const payload = lastEvent.payload as { taskId: string }
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(payload.taskId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        break
      }

      case 'PROJECT_CREATED':
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() })
        break

      case 'PROJECT_STATE_CHANGED': {
        const payload = lastEvent.payload as { previousState: string; newState: string }
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() })
        // If project is completed/failed, refresh tasks too
        if (payload.newState === 'COMPLETED' || payload.newState === 'FAILED') {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
        }
        break
      }

      case 'AGENT_HEARTBEAT_RECEIVED': {
        const payload = lastEvent.payload as { agentId: string }
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.detail(payload.agentId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() })
        break
      }

      default:
        // Unknown event type - optionally log
        break
    }
  }, [lastEvent, queryClient])

  return {
    status,
    lastEvent,
    error,
    isConnected,
  }
}

/**
 * Hook for subscribing to specific event types
 * 
 * Usage:
 * useEventSubscription('TASK_STATUS_CHANGED', (event) => {
 *   toast.success(`Task ${event.payload.taskId} is now ${event.payload.newStatus}`)
 * })
 */
export function useEventSubscription(
  eventType: string | string[],
  callback: (event: DomainEvent) => void
) {
  const { lastEvent } = useEventSource()
  const callbackRef = useRef(callback)

  // Keep callback reference up to date
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!lastEvent) return

    const types = Array.isArray(eventType) ? eventType : [eventType]
    if (types.includes(lastEvent.type)) {
      callbackRef.current(lastEvent)
    }
  }, [lastEvent, eventType])
}

/**
 * Hook for optimistic task status updates based on events
 * 
 * Updates local cache before server confirms
 */
export function useOptimisticTaskUpdates() {
  const queryClient = useQueryClient()
  const { lastEvent } = useEventSource()

  useEffect(() => {
    if (!lastEvent) return

    if (lastEvent.type === 'TASK_STATUS_CHANGED') {
      const payload = lastEvent.payload as {
        taskId: string
        previousStatus: TaskStatus
        newStatus: TaskStatus
      }

      // Optimistically update task in cache
      queryClient.setQueryData(
        queryKeys.tasks.detail(payload.taskId),
        (old: { status: TaskStatus } | undefined) => {
          if (!old) return old
          return { ...old, status: payload.newStatus }
        }
      )

      // Update in lists too
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists() },
        (old: { tasks: Array<{ id: string; status: TaskStatus }>; meta: unknown } | undefined) => {
          if (!old) return old
          return {
            ...old,
            tasks: old.tasks.map((task) =>
              task.id === payload.taskId
                ? { ...task, status: payload.newStatus }
                : task
            ),
          }
        }
      )
    }
  }, [lastEvent, queryClient])
}
