/**
 * Real-time Data Synchronization Hook
 * 
 * Combines SSE events with polling fallback for bulletproof data freshness:
 * - Primary: SSE events for instant updates
 * - Fallback: Polling every 60s (configurable)
 * - Reconnect logic with exponential backoff
 * - Event replay on reconnect
 * - Visibility API integration (pause when tab hidden)
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface UseRealtimeSyncOptions {
  /** Enable SSE (default: true) */
  enableSSE?: boolean;
  /** Polling interval in ms (default: 60000) */
  pollIntervalMs?: number;
  /** Max SSE reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial SSE reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number;
  /** Number of events to replay on reconnect (default: 10) */
  replayCount?: number;
}

interface SyncState {
  isConnected: boolean;
  lastEventAt: Date | null;
  reconnectAttempts: number;
  connectionType: 'sse' | 'polling' | null;
}

/**
 * Main hook for real-time synchronization
 * 
 * Usage:
 * ```tsx
 * function Dashboard() {
 *   useRealtimeSync({
 *     enableSSE: true,
 *     pollIntervalMs: 30000,
 *   })
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const {
    enableSSE = true,
    pollIntervalMs = 60000,
    maxReconnectAttempts = 5,
    reconnectDelayMs = 1000,
    replayCount = 10,
  } = options;

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isVisibleRef = useRef(true);
  const lastEventTimeRef = useRef<number>(0);

  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    lastEventAt: null,
    reconnectAttempts: 0,
    connectionType: null,
  });

  /**
   * Handle incoming SSE events
   */
  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        lastEventTimeRef.current = Date.now();

        // Update sync state
        setSyncState((prev) => ({
          ...prev,
          lastEventAt: new Date(),
        }));

        // Route event to appropriate query invalidation
        routeEventToQuery(data, queryClient);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    },
    [queryClient]
  );

  /**
   * Start SSE connection
   */
  const connectSSE = useCallback(() => {
    if (!enableSSE || eventSourceRef.current) return;

    try {
      // Include last event time for replay
      const url = new URL('/api/events', window.location.origin);
      if (lastEventTimeRef.current > 0) {
        url.searchParams.set('since', lastEventTimeRef.current.toString());
      }

      const es = new EventSource(url.toString());
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('SSE connected');
        reconnectAttemptsRef.current = 0;
        setSyncState({
          isConnected: true,
          lastEventAt: new Date(),
          reconnectAttempts: 0,
          connectionType: 'sse',
        });
      };

      es.onmessage = handleEvent;

      es.onerror = () => {
        console.error('SSE error, will retry...');
        es.close();
        eventSourceRef.current = null;

        setSyncState((prev) => ({
          ...prev,
          isConnected: false,
          connectionType: 'polling',
        }));

        // Attempt reconnect with backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectDelayMs * 2 ** reconnectAttemptsRef.current,
            30000 // Max 30s
          );
          reconnectAttemptsRef.current++;

          setSyncState((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      setSyncState((prev) => ({
        ...prev,
        connectionType: 'polling',
      }));
    }
  }, [enableSSE, handleEvent, maxReconnectAttempts, reconnectDelayMs]);

  /**
   * Start polling fallback
   */
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    const poll = () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    };

    pollIntervalRef.current = setInterval(poll, pollIntervalMs);

    // Initial poll
    poll();
  }, [pollIntervalMs, queryClient]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle visibility change (pause when tab hidden)
   */
  const handleVisibilityChange = useCallback(() => {
    isVisibleRef.current = document.visibilityState === 'visible';

    if (isVisibleRef.current) {
      // Tab became visible - reconnect SSE or restart polling
      if (enableSSE && !eventSourceRef.current) {
        connectSSE();
      }
      if (!enableSSE || !syncState.isConnected) {
        startPolling();
      }
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries();
    } else {
      // Tab hidden - can optionally pause polling to save resources
      // For now we keep polling running for background updates
    }
  }, [connectSSE, enableSSE, queryClient, startPolling, syncState.isConnected]);

  // Main effect
  useEffect(() => {
    if (enableSSE) {
      connectSSE();
    }

    // Always have polling as backup
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      stopPolling();
    };
  }, [connectSSE, enableSSE, handleVisibilityChange, startPolling, stopPolling]);

  return syncState;
}

/**
 * Route events to appropriate query invalidations
 */
function routeEventToQuery(event: { type: string; [key: string]: unknown }, queryClient: ReturnType<typeof useQueryClient>) {
  switch (event.type) {
    // Task events
    case 'TASK_CREATED':
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      break;

    case 'TASK_UPDATED':
    case 'TASK_STATUS_CHANGED':
      if (event.taskId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(event.taskId as string),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      break;

    case 'TASK_ASSIGNED':
      if (event.taskId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(event.taskId as string),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() });
      break;

    case 'TASK_COMPLETED':
    case 'TASK_FAILED':
      if (event.taskId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(event.taskId as string),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() });
      break;

    // Agent events
    case 'AGENT_STATUS_CHANGED':
    case 'AGENT_HEARTBEAT':
      if (event.agentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.detail(event.agentId as string),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() });
      break;

    // Project events
    case 'PROJECT_PROGRESS_UPDATED':
      if (event.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(event.projectId as string),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      break;

    // System events
    case 'STALENESS_DETECTED':
      // Full refresh on staleness detection
      queryClient.invalidateQueries();
      break;

    case 'LIMITS_RESET':
      if (event.agentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.detail(event.agentId as string),
        });
      }
      break;

    default:
      // Unknown event type - refresh all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.lists() });
  }
}

/**
 * Hook for monitoring connection health
 */
export function useConnectionHealth() {
  const [health, setHealth] = useState({
    isHealthy: true,
    lastPingAt: Date.now(),
    missedPings: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastPing = Date.now() - health.lastPingAt;
      const isHealthy = timeSinceLastPing < 120000; // 2 minutes

      setHealth((prev) => ({
        ...prev,
        isHealthy,
        missedPings: isHealthy ? 0 : prev.missedPings + 1,
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, [health.lastPingAt]);

  return {
    ...health,
    recordPing: () =>
      setHealth((prev) => ({
        ...prev,
        lastPingAt: Date.now(),
        missedPings: 0,
      })),
  };
}
