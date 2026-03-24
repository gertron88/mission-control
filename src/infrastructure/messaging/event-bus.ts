/**
 * Event Bus
 * 
 * Central event distribution system for event sourcing.
 * Supports in-process and external (Redis) event handling.
 */

import { DomainEvent, DomainEventBase } from '../../types/domain';

// ============================================================================
// TYPES
// ============================================================================

export type EventHandler<E extends DomainEvent = DomainEvent> = (
  event: E
) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  eventTypes: string[];
  handler: EventHandler;
  once?: boolean;
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getStream(aggregateId: string): Promise<DomainEvent[]>;
  getAll(options?: { 
    from?: Date; 
    to?: Date; 
    types?: string[];
    limit?: number;
  }): Promise<DomainEvent[]>;
}

// ============================================================================
// IN-MEMORY EVENT BUS
// ============================================================================

export class InMemoryEventBus {
  private subscribers = new Map<string, Set<EventSubscription>>();
  private history: DomainEvent[] = [];
  private maxHistorySize: number;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize || 10000;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(event: DomainEvent): Promise<void> {
    // Store in history
    this.history.push(event);
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    // Notify subscribers for this specific event type
    const specificSubscribers = this.subscribers.get(event.type);
    if (specificSubscribers) {
      await this.notifySubscribers(specificSubscribers, event);
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      await this.notifySubscribers(wildcardSubscribers, event);
    }
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private async notifySubscribers(
    subscribers: Set<EventSubscription>,
    event: DomainEvent
  ): Promise<void> {
    const toRemove: EventSubscription[] = [];

    for (const subscription of subscribers) {
      try {
        await subscription.handler(event);
        
        if (subscription.once) {
          toRemove.push(subscription);
        }
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
        // Continue with other subscribers
      }
    }

    // Clean up one-time subscriptions
    for (const sub of toRemove) {
      subscribers.delete(sub);
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(
    eventTypes: string[] | '*',
    handler: EventHandler,
    options: { once?: boolean } = {}
  ): () => void {
    const subscription: EventSubscription = {
      id: this.generateId(),
      eventTypes: eventTypes === '*' ? ['*'] : eventTypes,
      handler,
      once: options.once
    };

    const types = eventTypes === '*' ? ['*'] : eventTypes;
    
    for (const type of types) {
      if (!this.subscribers.has(type)) {
        this.subscribers.set(type, new Set());
      }
      this.subscribers.get(type)!.add(subscription);
    }

    // Return unsubscribe function
    return () => {
      for (const type of types) {
        const subs = this.subscribers.get(type);
        if (subs) {
          subs.delete(subscription);
        }
      }
    };
  }

  /**
   * Subscribe once to an event
   */
  once(eventType: string, handler: EventHandler): void {
    this.subscribe([eventType], handler, { once: true });
  }

  /**
   * Wait for a specific event (async/await friendly)
   */
  waitFor(
    eventType: string,
    timeoutMs: number = 30000,
    filter?: (event: DomainEvent) => boolean
  ): Promise<DomainEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event ${eventType}`));
      }, timeoutMs);

      const unsubscribe = this.subscribe([eventType], (event) => {
        if (!filter || filter(event)) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(event);
        }
      });
    });
  }

  /**
   * Get event history
   */
  getHistory(): readonly DomainEvent[] {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// EVENT STORE (Database-backed)
// ============================================================================

export class DatabaseEventStore implements EventStore {
  constructor(
    private db: {
      event: {
        create: (args: { data: unknown }) => Promise<unknown>;
        findMany: (args: {
          where?: unknown;
          orderBy?: unknown;
          take?: number;
        }) => Promise<unknown[]>;
      };
    }
  ) {}

  async append(event: DomainEvent): Promise<void> {
    await this.db.event.create({
      data: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        version: event.version,
        payload: event.payload,
        metadata: event.metadata,
        actorType: event.actor?.type,
        actorId: event.actor?.id
      }
    });
  }

  async getStream(aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.db.event.findMany({
      where: { aggregateId },
      orderBy: { timestamp: 'asc' }
    });

    return events.map(this.mapToDomainEvent);
  }

  async getAll(options: {
    from?: Date;
    to?: Date;
    types?: string[];
    limit?: number;
  } = {}): Promise<DomainEvent[]> {
    const where: Record<string, unknown> = {};
    
    if (options.from || options.to) {
      where.timestamp = {};
      if (options.from) where.timestamp.gte = options.from;
      if (options.to) where.timestamp.lte = options.to;
    }
    
    if (options.types?.length) {
      where.type = { in: options.types };
    }

    const events = await this.db.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit
    });

    return events.map(this.mapToDomainEvent);
  }

  private mapToDomainEvent(dbEvent: unknown): DomainEvent {
    // Implementation depends on actual Prisma schema
    // This is a type-safe placeholder
    return dbEvent as DomainEvent;
  }
}

// ============================================================================
// EVENT BUILDER
// ============================================================================

export class EventBuilder {
  private event: Partial<DomainEventBase> = {
    version: 1,
    timestamp: new Date()
  };

  id(id: string): this {
    this.event.id = id;
    return this;
  }

  type(type: string): this {
    this.event.type = type;
    return this;
  }

  aggregate(type: string, id: string): this {
    this.event.aggregateType = type;
    this.event.aggregateId = id;
    return this;
  }

  payload(payload: unknown): this {
    this.event.payload = payload;
    return this;
  }

  actor(type: 'AGENT' | 'HUMAN' | 'SYSTEM', id: string): this {
    this.event.actor = { type, id };
    return this;
  }

  metadata(metadata: Record<string, unknown>): this {
    this.event.metadata = { ...this.event.metadata, ...metadata };
    return this;
  }

  correlationId(id: string): this {
    if (!this.event.metadata) this.event.metadata = {};
    this.event.metadata.correlationId = id;
    return this;
  }

  causationId(id: string): this {
    if (!this.event.metadata) this.event.metadata = {};
    this.event.metadata.causationId = id;
    return this;
  }

  build(): DomainEventBase {
    if (!this.event.id) {
      this.event.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return this.event as DomainEventBase;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

// Single event bus instance for the application
export const globalEventBus = new InMemoryEventBus();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createEventBuilder(): EventBuilder {
  return new EventBuilder();
}

export function replayEvents<T>(
  events: DomainEvent[],
  initialState: T,
  reducer: (state: T, event: DomainEvent) => T
): T {
  return events.reduce(reducer, initialState);
}
