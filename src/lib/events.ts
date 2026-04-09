/**
 * Event Bus with Redis Support
 * 
 * Features:
 * - In-memory event bus for single-instance deployments
 * - Redis Pub/Sub for multi-instance (Vercel, Kubernetes)
 * - SSE stream management for real-time client updates
 * - Event persistence for replay capability
 */

type EventCallback = (data: string) => void;

interface Event {
  type: string;
  [key: string]: unknown;
}

// Redis client (lazy loaded)
let redisPub: ReturnType<typeof createRedisClient> | null = null;
let redisSub: ReturnType<typeof createRedisClient> | null = null;

function createRedisClient() {
  if (!process.env.REDIS_URL) return null;
  
  // Dynamic import to avoid issues if Redis isn't installed
  try {
    const Redis = require('ioredis');
    return new Redis(process.env.REDIS_URL);
  } catch {
    console.warn('Redis not available, using in-memory event bus');
    return null;
  }
}

class EventBus {
  private clients: Map<string, EventCallback> = new Map();
  private clientId = 0;
  private redisEnabled = false;
  private eventHistory: Array<{ event: Event; timestamp: number }> = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    if (!process.env.REDIS_URL) return;

    redisPub = createRedisClient();
    redisSub = createRedisClient();

    if (redisPub && redisSub) {
      this.redisEnabled = true;

      // Subscribe to broadcast channel
      await redisSub.subscribe('mission-control:events');
      redisSub.on('message', (_channel: string, message: string) => {
        // Broadcast to local clients when receiving Redis message
        this.broadcastToLocalClients(message);
      });

      console.log('Redis event bus initialized');
    }
  }

  /**
   * Subscribe to events
   * Returns unsubscribe function
   */
  subscribe(callback: EventCallback): () => void {
    const id = (++this.clientId).toString();
    this.clients.set(id, callback);

    return () => {
      this.clients.delete(id);
    };
  }

  /**
   * Subscribe with historical replay
   * Gets last N events immediately, then live events
   */
  subscribeWithReplay(callback: EventCallback, replayCount = 10): () => void {
    // Send historical events first
    const history = this.eventHistory.slice(-replayCount);
    for (const { event } of history) {
      try {
        callback(JSON.stringify(event));
      } catch (error) {
        console.error('Failed to send historical event:', error);
      }
    }

    // Then subscribe to live events
    return this.subscribe(callback);
  }

  /**
   * Broadcast event to all clients
   */
  broadcast(event: Event) {
    const data = JSON.stringify(event);

    // Store in history
    this.eventHistory.push({ event, timestamp: Date.now() });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Local broadcast
    this.broadcastToLocalClients(data);

    // Redis broadcast (for multi-instance)
    if (this.redisEnabled && redisPub) {
      redisPub.publish('mission-control:events', data).catch((err: Error) => {
        console.error('Redis publish failed:', err);
      });
    }
  }

  private broadcastToLocalClients(data: string) {
    this.clients.forEach((callback, id) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Failed to send event to client ${id}:`, error);
        this.clients.delete(id);
      }
    });
  }

  /**
   * Get event history for replay
   */
  getHistory(since?: number): Event[] {
    if (since) {
      return this.eventHistory
        .filter((h) => h.timestamp > since)
        .map((h) => h.event);
    }
    return this.eventHistory.map((h) => h.event);
  }

  /**
   * Clear old history
   */
  clearHistory(olderThanMs: number) {
    const cutoff = Date.now() - olderThanMs;
    this.eventHistory = this.eventHistory.filter((h) => h.timestamp > cutoff);
  }
}

export const eventBus = new EventBus();

/**
 * Broadcast an event to all connected clients
 */
export function broadcastEvent(event: Event) {
  eventBus.broadcast(event);
}

/**
 * Type-safe event creators
 */
export const events = {
  // Task events
  taskCreated: (taskId: string, projectId: string, data: unknown) =>
    broadcastEvent({ type: 'TASK_CREATED', taskId, projectId, data }),

  taskUpdated: (taskId: string, projectId: string, changes: unknown) =>
    broadcastEvent({ type: 'TASK_UPDATED', taskId, projectId, changes }),

  taskAssigned: (taskId: string, agentId: string, autoAssigned: boolean) =>
    broadcastEvent({
      type: 'TASK_ASSIGNED',
      taskId,
      data: { agentId, autoAssigned },
    }),

  taskCompleted: (taskId: string, projectId: string, result: unknown) =>
    broadcastEvent({ type: 'TASK_COMPLETED', taskId, projectId, result }),

  taskFailed: (taskId: string, projectId: string, error: unknown) =>
    broadcastEvent({ type: 'TASK_FAILED', taskId, projectId, error }),

  taskBlocked: (taskId: string, reason: string, blockerType: string) =>
    broadcastEvent({ type: 'TASK_BLOCKED', taskId, data: { reason, blockerType } }),

  // Agent events
  agentStatusChanged: (agentId: string, status: string, reason?: string) =>
    broadcastEvent({
      type: 'AGENT_STATUS_CHANGED',
      agentId,
      data: { status, reason },
    }),

  agentHeartbeat: (agentId: string, metrics: unknown) =>
    broadcastEvent({ type: 'AGENT_HEARTBEAT', agentId, data: metrics }),

  // Project events
  projectProgressUpdated: (projectId: string, progress: number) =>
    broadcastEvent({
      type: 'PROJECT_PROGRESS_UPDATED',
      projectId,
      data: { progress },
    }),

  // System events
  stalenessDetected: (entityType: string, entityId: string, reason: string) =>
    broadcastEvent({
      type: 'STALENESS_DETECTED',
      data: { entityType, entityId, reason },
    }),

  limitsReset: (agentId: string, limitType: string) =>
    broadcastEvent({
      type: 'LIMITS_RESET',
      agentId,
      data: { limitType },
    }),
} as const;
