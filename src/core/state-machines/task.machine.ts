/**
 * Task State Machine
 * 
 * Enforces valid state transitions with business rules.
 * All transitions are explicit and auditable.
 */

import { 
  Result, 
  StateTransitionError, 
  ValidationError,
  TaskStatus 
} from '../../types/domain';

// ============================================================================
// STATE MACHINE CONFIGURATION
// ============================================================================

export interface TaskStateContext {
  taskId: string;
  assigneeId?: string;
  dependencies: string[];
  unmetDependencies: string[];
  outputs?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  agentStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  blocker?: {
    type: string;
    reason: string;
  };
}

export type TaskEvent = 
  | { type: 'DEPENDENCIES_MET' }
  | { type: 'DEPENDENCIES_UNMET' }
  | { type: 'ASSIGNED'; assigneeId: string }
  | { type: 'UNASSIGNED' }
  | { type: 'STARTED' }
  | { type: 'COMPLETED'; outputs?: Record<string, unknown> }
  | { type: 'FAILED'; reason: string }
  | { type: 'BLOCKED'; blockerType: string; reason: string }
  | { type: 'UNBLOCKED'; resolution: string }
  | { type: 'VALIDATED' }
  | { type: 'REJECTED'; reason: string }
  | { type: 'CANCEL'; reason: string }
  | { type: 'RETRY' }
  | { type: 'FORCE_COMPLETE' }; // Admin override

interface TransitionConfig {
  target: TaskStatus;
  guard?: (ctx: TaskStateContext, event: TaskEvent) => boolean;
  action?: (ctx: TaskStateContext, event: TaskEvent) => Partial<TaskStateContext>;
}

type StateTransitions = Partial<Record<TaskEvent['type'], TransitionConfig>>;

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

const taskStateTransitions: Record<TaskStatus, StateTransitions> = {
  QUEUED: {
    DEPENDENCIES_MET: {
      target: 'READY',
      guard: (ctx) => ctx.unmetDependencies.length === 0
    },
    CANCEL: { target: 'CANCELED' }
  },
  
  READY: {
    ASSIGNED: {
      target: 'ASSIGNED',
      guard: (ctx, event) => {
        if (event.type !== 'ASSIGNED') return false;
        return !!event.assigneeId;
      },
      action: (ctx, event) => {
        if (event.type !== 'ASSIGNED') return {};
        return { assigneeId: event.assigneeId };
      }
    },
    DEPENDENCIES_UNMET: { target: 'QUEUED' },
    CANCEL: { target: 'CANCELED' }
  },
  
  ASSIGNED: {
    STARTED: {
      target: 'RUNNING',
      guard: (ctx) => ctx.agentStatus === 'ONLINE'
    },
    UNASSIGNED: { 
      target: 'READY',
      action: () => ({ assigneeId: undefined })
    },
    BLOCKED: {
      target: 'BLOCKED',
      guard: (ctx, event) => event.type === 'BLOCKED',
      action: (ctx, event) => {
        if (event.type !== 'BLOCKED') return {};
        return {
          blocker: { type: event.blockerType, reason: event.reason }
        };
      }
    },
    CANCEL: { target: 'CANCELED' }
  },
  
  RUNNING: {
    COMPLETED: {
      target: 'AWAITING_VALIDATION',
      guard: (ctx, event) => {
        if (event.type !== 'COMPLETED') return false;
        // Require outputs for completion
        return !!event.outputs || !!ctx.outputs;
      },
      action: (ctx, event) => {
        if (event.type !== 'COMPLETED') return {};
        return { outputs: event.outputs || ctx.outputs };
      }
    },
    FAILED: {
      target: 'FAILED',
      action: (ctx) => ({ retryCount: ctx.retryCount + 1 })
    },
    BLOCKED: {
      target: 'BLOCKED',
      guard: (ctx, event) => event.type === 'BLOCKED',
      action: (ctx, event) => {
        if (event.type !== 'BLOCKED') return {};
        return {
          blocker: { type: event.blockerType, reason: event.reason }
        };
      }
    },
    CANCEL: { target: 'CANCELED' }
  },
  
  AWAITING_VALIDATION: {
    VALIDATED: { target: 'COMPLETE' },
    REJECTED: {
      target: 'FAILED',
      guard: (ctx) => ctx.retryCount < ctx.maxRetries
    },
    CANCEL: { target: 'CANCELED' }
  },
  
  BLOCKED: {
    UNBLOCKED: {
      target: 'RUNNING',
      guard: (ctx, event) => event.type === 'UNBLOCKED',
      action: () => ({ blocker: undefined })
    },
    // Can also go back to ready if unassigned while blocked
    UNASSIGNED: {
      target: 'READY',
      action: () => ({ assigneeId: undefined, blocker: undefined })
    }
  },
  
  FAILED: {
    RETRY: {
      target: 'READY',
      guard: (ctx) => ctx.retryCount < ctx.maxRetries
    },
    CANCEL: { target: 'CANCELED' },
    FORCE_COMPLETE: { target: 'COMPLETE' } // Admin override
  },
  
  COMPLETE: {
    // Terminal state - no transitions out except admin override
  },
  
  CANCELED: {
    // Terminal state
  },
  
  AWAITING_DEPENDENCY: {
    DEPENDENCIES_MET: { target: 'READY' },
    CANCEL: { target: 'CANCELED' }
  }
};

// ============================================================================
// STATE MACHINE IMPLEMENTATION
// ============================================================================

export class TaskStateMachine {
  constructor(
    private status: TaskStatus,
    private context: TaskStateContext
  ) {}
  
  getState(): TaskStatus {
    return this.status;
  }
  
  getContext(): TaskStateContext {
    return { ...this.context };
  }
  
  /**
   * Check if a transition is allowed without executing it
   */
  canTransition(event: TaskEvent): boolean {
    const transitions = taskStateTransitions[this.status];
    if (!transitions) return false;
    
    const config = transitions[event.type];
    if (!config) return false;
    
    if (config.guard) {
      return config.guard(this.context, event);
    }
    
    return true;
  }
  
  /**
   * Get list of allowed events from current state
   */
  getAllowedEvents(): TaskEvent['type'][] {
    const transitions = taskStateTransitions[this.status];
    if (!transitions) return [];
    
    return Object.keys(transitions).filter(eventType => {
      const config = transitions[eventType as TaskEvent['type']];
      if (!config) return false;
      if (config.guard) {
        // We need a dummy event to check the guard
        const dummyEvent = { type: eventType } as TaskEvent;
        return config.guard(this.context, dummyEvent);
      }
      return true;
    }) as TaskEvent['type'][];
  }
  
  /**
   * Execute a state transition
   */
  transition(event: TaskEvent): Result<{ status: TaskStatus; context: TaskStateContext }, StateTransitionError> {
    const transitions = taskStateTransitions[this.status];
    if (!transitions) {
      return Result.err(new StateTransitionError(
        'TASK',
        this.context.taskId,
        this.status,
        'UNKNOWN',
        `No transitions defined for state ${this.status}`
      ));
    }
    
    const config = transitions[event.type];
    if (!config) {
      return Result.err(new StateTransitionError(
        'TASK',
        this.context.taskId,
        this.status,
        'UNKNOWN',
        `Event ${event.type} not allowed from state ${this.status}`
      ));
    }
    
    // Check guard conditions
    if (config.guard && !config.guard(this.context, event)) {
      return Result.err(new StateTransitionError(
        'TASK',
        this.context.taskId,
        this.status,
        config.target,
        `Guard condition failed for event ${event.type}`
      ));
    }
    
    // Execute action if defined
    const contextUpdate = config.action ? config.action(this.context, event) : {};
    const newContext = { ...this.context, ...contextUpdate };
    
    return Result.ok({
      status: config.target,
      context: newContext
    });
  }
  
  /**
   * Create a new state machine instance with updated state
   */
  withState(status: TaskStatus, context?: Partial<TaskStateContext>): TaskStateMachine {
    return new TaskStateMachine(status, { ...this.context, ...context });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createTaskStateMachine(
  taskId: string,
  initialStatus: TaskStatus = 'QUEUED',
  context?: Partial<Omit<TaskStateContext, 'taskId'>>
): TaskStateMachine {
  const defaultContext: TaskStateContext = {
    taskId,
    dependencies: [],
    unmetDependencies: [],
    retryCount: 0,
    maxRetries: 3,
    ...context
  };
  
  return new TaskStateMachine(initialStatus, defaultContext);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the terminal states (no outgoing transitions)
 */
export function getTerminalStates(): TaskStatus[] {
  return ['COMPLETE', 'CANCELED'];
}

/**
 * Get active states (work in progress)
 */
export function getActiveStates(): TaskStatus[] {
  return ['ASSIGNED', 'RUNNING', 'AWAITING_VALIDATION', 'BLOCKED'];
}

/**
 * Check if a state represents work that hasn't started yet
 */
export function isPendingState(status: TaskStatus): boolean {
  return ['QUEUED', 'READY'].includes(status);
}

/**
 * Check if a state represents completed work (success or failure)
 */
export function isTerminalState(status: TaskStatus): boolean {
  return ['COMPLETE', 'CANCELED', 'FAILED'].includes(status);
}
