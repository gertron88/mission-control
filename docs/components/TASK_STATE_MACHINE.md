# TaskStateMachine Specification

**File:** `src/core/state-machines/task.machine.ts`  
**Purpose:** Enforces valid task lifecycle transitions  
**Dependencies:** `src/types/domain.ts`

---

## Overview

The TaskStateMachine is the single source of truth for valid task status transitions. All code that changes task status MUST go through this state machine.

---

## States

```typescript
type TaskStatus = 
  | 'QUEUED'               // Initial state
  | 'READY'                // Dependencies met
  | 'ASSIGNED'             // Assigned to agent
  | 'RUNNING'              // Agent working
  | 'AWAITING_VALIDATION'  // Completed, needs validation
  | 'BLOCKED'              // Blocked by issue
  | 'FAILED'               // Execution failed
  | 'COMPLETE'             // Successfully completed (terminal)
  | 'CANCELED';            // Canceled (terminal)
```

---

## Events

```typescript
type TaskEvent =
  | { type: 'DEPENDENCIES_MET' }
  | { type: 'DEPENDENCIES_UNMET' }
  | { type: 'ASSIGNED' }
  | { type: 'UNASSIGNED' }
  | { type: 'STARTED' }
  | { type: 'COMPLETED' }
  | { type: 'VALIDATED' }
  | { type: 'REJECTED' }
  | { type: 'BLOCKED' }
  | { type: 'UNBLOCKED' }
  | { type: 'FAILED' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' };
```

---

## State Transitions

### Valid Transitions Table

| Current State | Event | Next State | Guards |
|--------------|-------|------------|--------|
| QUEUED | DEPENDENCIES_MET | READY | `unmetDependencies.length === 0` |
| QUEUED | CANCEL | CANCELED | - |
| READY | ASSIGNED | ASSIGNED | - |
| READY | CANCEL | CANCELED | - |
| ASSIGNED | STARTED | RUNNING | `assigneeId !== undefined` |
| ASSIGNED | UNASSIGNED | READY | - |
| ASSIGNED | CANCEL | CANCELED | - |
| RUNNING | COMPLETED | AWAITING_VALIDATION | - |
| RUNNING | BLOCKED | BLOCKED | - |
| RUNNING | FAILED | FAILED | - |
| RUNNING | CANCEL | CANCELED | - |
| AWAITING_VALIDATION | VALIDATED | COMPLETE | - |
| AWAITING_VALIDATION | REJECTED | RUNNING | - |
| AWAITING_VALIDATION | FAILED | FAILED | - |
| BLOCKED | UNBLOCKED | RUNNING | - |
| BLOCKED | CANCEL | CANCELED | - |
| FAILED | RETRY | RUNNING | `retryCount < maxRetries` |
| FAILED | CANCEL | CANCELED | - |

---

## Context

```typescript
interface TaskStateContext {
  assigneeId?: string;           // Current assignee
  dependencies: string[];        // Task IDs this task depends on
  unmetDependencies: string[];   // Dependencies not yet complete
  retryCount: number;            // Number of retry attempts
  maxRetries: number;            // Maximum allowed retries
}
```

---

## Usage

### Creating a State Machine

```typescript
import { createTaskStateMachine } from '@/core/state-machines/task.machine';

const machine = createTaskStateMachine(
  taskId,              // string - Task ID for error messages
  'QUEUED',            // TaskStatus - Initial/current state
  {
    assigneeId: 'agent_123',
    dependencies: ['task_1', 'task_2'],
    unmetDependencies: ['task_2'],
    retryCount: 0,
    maxRetries: 3,
  }
);
```

### Checking Valid Transitions

```typescript
// Check if a specific transition is allowed
const canStart = machine.canTransition({ type: 'STARTED' });
// Returns: boolean

// Get all allowed events from current state
const allowedEvents = machine.getAllowedEvents();
// Returns: TaskEvent['type'][]
```

### Executing Transitions

```typescript
// Attempt a transition
const result = machine.transition({ type: 'STARTED' });

if (result.ok) {
  const newState = result.value;
  console.log(`Transitioned to: ${newState}`);
} else {
  const error = result.error;
  console.error(`Transition failed: ${error.message}`);
}
```

### Utility Methods

```typescript
// Check if current state is terminal
const isTerminal = machine.isTerminalState();
// Returns: boolean (true if COMPLETE or CANCELED)

// Check if current state is active (work in progress)
const isActive = ['ASSIGNED', 'RUNNING', 'AWAITING_VALIDATION', 'BLOCKED']
  .includes(machine.state);

// Check if state is pending (not started)
const isPending = ['QUEUED', 'READY'].includes(machine.state);
```

---

## Integration with Services

### TaskService Pattern

```typescript
async updateTask(
  taskId: string,
  input: UpdateTaskInput,
  actorId: string,
  actorHandle: string
): Promise<Result<any, Error>> {
  // ... fetch current task

  // Validate status transition using state machine
  if (input.status && input.status !== currentTask.status) {
    const machine = createTaskStateMachine(
      taskId,
      currentTask.status as DomainTaskStatus,
      {
        assigneeId: currentTask.assigneeId || undefined,
        dependencies: currentTask.dependencies as string[],
        unmetDependencies: [], // Calculate from DB
        retryCount: currentTask.retryCount,
        maxRetries: 3,
      }
    );

    const event = this.mapStatusToEvent(input.status);
    const canTransition = machine.canTransition({ type: event });
    
    if (!canTransition) {
      return Result.err(new StateTransitionError(
        'TASK',
        taskId,
        currentTask.status,
        input.status,
        'Invalid state transition'
      ));
    }
  }

  // ... proceed with update
}

// Helper to map status to event
private mapStatusToEvent(status: TaskStatus): string {
  const mapping: Record<string, string> = {
    'QUEUED': 'DEPENDENCIES_UNMET',
    'READY': 'DEPENDENCIES_MET',
    'ASSIGNED': 'ASSIGNED',
    'RUNNING': 'STARTED',
    'AWAITING_VALIDATION': 'COMPLETED',
    'COMPLETE': 'VALIDATED',
    'FAILED': 'FAILED',
    'BLOCKED': 'BLOCKED',
    'CANCELED': 'CANCEL',
  };
  return mapping[status] || status;
}
```

---

## Error Handling

The state machine returns `Result<newState, StateTransitionError>`:

```typescript
const result = machine.transition({ type: 'STARTED' });

if (!result.ok) {
  // result.error is StateTransitionError with:
  // - resourceType: 'TASK'
  // - resourceId: taskId
  // - fromState: current state
  // - toState: attempted state
  // - message: human-readable reason
}
```

---

## Rules for Sub-Agents

1. **NEVER** change task status directly - always use the state machine
2. **ALWAYS** provide complete context when creating the machine
3. **ALWAYS** check `canTransition()` before calling `transition()`
4. **NEVER** bypass the state machine guards
5. **ALWAYS** handle the Result type properly (check `result.ok`)

---

## Common Patterns

### Checking if Task Can Start

```typescript
const machine = createTaskStateMachine(task.id, task.status, context);
const canStart = task.status === 'ASSIGNED' && 
  machine.canTransition({ type: 'STARTED' });
```

### Checking if Task Can Complete

```typescript
const canComplete = task.status === 'RUNNING' && 
  machine.canTransition({ type: 'COMPLETED' });
```

### Handling Failed Tasks

```typescript
if (task.status === 'FAILED') {
  const machine = createTaskStateMachine(task.id, 'FAILED', {
    ...context,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
  });
  
  const canRetry = machine.canTransition({ type: 'RETRY' });
  // Enable retry button if canRetry is true
}
```

---

## Testing

```typescript
import { createTaskStateMachine } from '@/core/state-machines/task.machine';

describe('TaskStateMachine', () => {
  it('should allow QUEUED → READY when dependencies met', () => {
    const machine = createTaskStateMachine('task_1', 'QUEUED', {
      dependencies: [],
      unmetDependencies: [],
      retryCount: 0,
      maxRetries: 3,
    });
    
    expect(machine.canTransition({ type: 'DEPENDENCIES_MET' })).toBe(true);
  });

  it('should NOT allow ASSIGNED → RUNNING without assignee', () => {
    const machine = createTaskStateMachine('task_1', 'ASSIGNED', {
      // No assigneeId provided
      dependencies: [],
      unmetDependencies: [],
      retryCount: 0,
      maxRetries: 3,
    });
    
    expect(machine.canTransition({ type: 'STARTED' })).toBe(false);
  });
});
```

---

**See also:**
- `PROJECT_SPECIFICATION.md` - Overall project spec
- `src/services/task.service.ts` - Service that uses this state machine
- `src/types/domain.ts` - Error types and Result type
