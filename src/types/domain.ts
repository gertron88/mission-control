/**
 * Core domain types for Mission Control
 * 
 * These types are framework-agnostic and represent the business domain.
 * They should not depend on any external libraries except for type definitions.
 */

// ============================================================================
// RESULT TYPE - Explicit error handling
// ============================================================================

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  err: <E>(error: E): Result<never, E> => ({ ok: false, error }),
  
  map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
    result.ok ? Result.ok(fn(result.value)) : result,
    
  flatMap: <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
    result.ok ? fn(result.value) : result,
    
  unwrap: <T, E>(result: Result<T, E>, fallback?: T): T =>
    result.ok ? result.value : (fallback ?? (() => { throw result.error; })()),
    
  fromPromise: async <T>(promise: Promise<T>): Promise<Result<T, Error>> => {
    try {
      return Result.ok(await promise);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
};

// ============================================================================
// DOMAIN ERRORS
// ============================================================================

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly timestamp = new Date();
  
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class StateTransitionError extends DomainError {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly severity = 'MEDIUM';
  
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly reason: string
  ) {
    super(
      `Cannot transition ${entityType} ${entityId} from ${from} to ${to}: ${reason}`,
      { entityType, entityId, from, to, reason }
    );
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'MEDIUM';
  
  constructor(
    message: string,
    public readonly field?: string,
    public readonly constraints?: string[]
  ) {
    super(message, { field, constraints });
  }
}

export class DependencyError extends DomainError {
  readonly code = 'DEPENDENCY_ERROR';
  readonly severity = 'HIGH';
  
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly dependencyIds: string[]
  ) {
    super(message, { taskId, dependencyIds });
  }
}

export class AuthorizationError extends DomainError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly severity = 'CRITICAL';
  
  constructor(
    message: string,
    public readonly actorId: string,
    public readonly action: string,
    public readonly resource: string
  ) {
    super(message, { actorId, action, resource });
  }
}

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

export interface DomainEventBase {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Date;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly actor?: {
    type: 'AGENT' | 'HUMAN' | 'SYSTEM';
    id: string;
  };
  readonly metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  };
}

// Project Events
export interface ProjectCreatedEvent extends DomainEventBase {
  type: 'PROJECT_CREATED';
  payload: {
    name: string;
    charter: string;
    objectives: unknown;
    portfolioId: string;
  };
}

export interface ProjectStateChangedEvent extends DomainEventBase {
  type: 'PROJECT_STATE_CHANGED';
  payload: {
    previousState: string;
    newState: string;
    reason?: string;
  };
}

// Task Events
export interface TaskCreatedEvent extends DomainEventBase {
  type: 'TASK_CREATED';
  payload: {
    title: string;
    description: string;
    type: string;
    priority: string;
    projectId: string;
    milestoneId?: string;
    dependencies: string[];
  };
}

export interface TaskAssignedEvent extends DomainEventBase {
  type: 'TASK_ASSIGNED';
  payload: {
    taskId: string;
    agentId: string;
    previousAgentId?: string;
  };
}

export interface TaskStatusChangedEvent extends DomainEventBase {
  type: 'TASK_STATUS_CHANGED';
  payload: {
    taskId: string;
    previousStatus: string;
    newStatus: string;
    reason?: string;
  };
}

export interface TaskBlockedEvent extends DomainEventBase {
  type: 'TASK_BLOCKED';
  payload: {
    taskId: string;
    blockerType: string;
    reason: string;
  };
}

export interface TaskUnblockedEvent extends DomainEventBase {
  type: 'TASK_UNBLOCKED';
  payload: {
    taskId: string;
    resolution: string;
  };
}

export interface DependencyResolvedEvent extends DomainEventBase {
  type: 'DEPENDENCY_RESOLVED';
  payload: {
    taskId: string;
    completedDependencyId: string;
    remainingDependencies: number;
  };
}

// Agent Events
export interface AgentHeartbeatReceivedEvent extends DomainEventBase {
  type: 'AGENT_HEARTBEAT_RECEIVED';
  payload: {
    agentId: string;
    status: string;
    load: number;
    metrics?: {
      cpuUsage?: number;
      memoryUsage?: number;
    };
  };
}

export type DomainEvent =
  | ProjectCreatedEvent
  | ProjectStateChangedEvent
  | TaskCreatedEvent
  | TaskAssignedEvent
  | TaskStatusChangedEvent
  | TaskBlockedEvent
  | TaskUnblockedEvent
  | DependencyResolvedEvent
  | AgentHeartbeatReceivedEvent;

// ============================================================================
// VALUE OBJECTS
// ============================================================================

export interface Money {
  amount: number;
  currency: string;
}

export interface TimeRange {
  start: Date;
  end?: Date;
}

export interface Effort {
  estimated: number; // hours
  actual?: number;   // hours
}

// ============================================================================
// AGGREGATE INTERFACES
// ============================================================================

export interface TaskAggregate {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  assigneeId?: string;
  blocker?: {
    type: BlockerType;
    reason: string;
    createdAt: Date;
  };
  applyEvent(event: DomainEvent): void;
}

// ============================================================================
// ENUM TYPES (mirroring Prisma schema for type safety)
// ============================================================================

export type ProjectState = 
  | 'PROPOSED' 
  | 'APPROVED' 
  | 'PLANNING' 
  | 'EXECUTING' 
  | 'BLOCKED' 
  | 'AWAITING_REVIEW' 
  | 'DEPLOYING' 
  | 'MONITORING' 
  | 'COMPLETED' 
  | 'ROLLBACK' 
  | 'FAILED' 
  | 'ARCHIVED';

export type TaskStatus = 
  | 'QUEUED' 
  | 'READY' 
  | 'ASSIGNED' 
  | 'RUNNING' 
  | 'AWAITING_DEPENDENCY' 
  | 'AWAITING_VALIDATION' 
  | 'BLOCKED' 
  | 'FAILED' 
  | 'COMPLETE' 
  | 'CANCELED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskType = 
  | 'FEATURE' 
  | 'BUG' 
  | 'TRADING_STRATEGY' 
  | 'INFRASTRUCTURE' 
  | 'SECURITY' 
  | 'RESEARCH' 
  | 'DOCUMENTATION' 
  | 'DEPLOYMENT' 
  | 'ANALYSIS' 
  | 'COORDINATION' 
  | 'TESTING' 
  | 'CODE_REVIEW';

export type BlockerType = 
  | 'DEPENDENCY_UNMET' 
  | 'HUMAN_APPROVAL_PENDING' 
  | 'MISSING_CREDENTIALS' 
  | 'FAILING_TESTS' 
  | 'INFRA_UNAVAILABLE' 
  | 'AMBIGUOUS_REQUIREMENTS' 
  | 'RISK_THRESHOLD_EXCEEDED' 
  | 'EXTERNAL_DEPENDENCY' 
  | 'RESOURCE_UNAVAILABLE';

export type AgentRole = 
  | 'COORDINATOR' 
  | 'TRADING_LEAD' 
  | 'FULLSTACK_DEV' 
  | 'INFRASTRUCTURE' 
  | 'SECURITY_QA' 
  | 'RESEARCHER' 
  | 'CUSTOM';

export type AgentStatus = 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR' | 'DISABLED';
