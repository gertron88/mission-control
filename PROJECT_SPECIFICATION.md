# Mission Control - Project Specification

**Version:** 1.0.0  
**Last Updated:** 2026-03-25  
**Purpose:** Single source of truth for all sub-agents working on Mission Control

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Domain Model & Types](#domain-model--types)
3. [Naming Conventions](#naming-conventions)
4. [State Machines](#state-machines)
5. [Service Layer Patterns](#service-layer-patterns)
6. [API Layer Patterns](#api-layer-patterns)
7. [React Query Hooks](#react-query-hooks)
8. [Error Handling](#error-handling)
9. [Event System](#event-system)
10. [Component Dependencies](#component-dependencies)

---

## Architecture Overview

Mission Control follows a **Clean Architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                                │
│  - Pages, components, visual elements                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ uses
┌───────────────────────▼─────────────────────────────────────┐
│  Hook Layer (React Query)                                   │
│  - useTasks, useAgents, useProjects, useDispatch            │
│  - Optimistic updates, cache management                     │
└───────────────────────┬─────────────────────────────────────┘
                        │ uses
┌───────────────────────▼─────────────────────────────────────┐
│  API Layer (Type-safe client)                               │
│  - api client, endpoints definitions                        │
│  - Error handling, request/response types                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ calls
┌───────────────────────▼─────────────────────────────────────┐
│  Service Layer (Business Logic)                             │
│  - TaskService, AgentService, ProjectService                │
│  - DispatchService, DependencyService                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ uses
┌───────────────────────▼─────────────────────────────────────┐
│  Core Layer (Domain Logic)                                  │
│  - State machines, dependency resolver, dispatcher          │
│  - Framework-agnostic business rules                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ uses
┌───────────────────────▼─────────────────────────────────────┐
│  Infrastructure Layer                                       │
│  - Prisma ORM, Event bus, Audit logger                      │
│  - External integrations (Discord, GitHub)                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- Dependencies only flow inward (UI → Core)
- Core layer is framework-agnostic
- All errors use explicit `Result<T, E>` pattern
- All state changes emit events
- All actions are audited

---

## Domain Model & Types

### Core Enums (DO NOT CHANGE VALUES)

These enum values are stored in the database. Changing them requires migrations.

```typescript
// TASK STATES - Used in Task.status, TaskStateMachine
enum TaskStatus {
  QUEUED = 'QUEUED',                    // Initial state, waiting for dependencies
  READY = 'READY',                      // Dependencies met, awaiting assignment
  ASSIGNED = 'ASSIGNED',                // Assigned to agent, not started
  RUNNING = 'RUNNING',                  // Agent actively working
  AWAITING_VALIDATION = 'AWAITING_VALIDATION', // Completed, needs validation
  BLOCKED = 'BLOCKED',                  // Blocked by issue
  FAILED = 'FAILED',                    // Execution failed
  COMPLETE = 'COMPLETE',                // Successfully completed
  CANCELED = 'CANCELED',                // Manually canceled
}

// PROJECT STATES - Used in Project.state
enum ProjectState {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  BLOCKED = 'BLOCKED',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  DEPLOYING = 'DEPLOYING',
  MONITORING = 'MONITORING',
  COMPLETED = 'COMPLETED',
  ROLLBACK = 'ROLLBACK',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

// AGENT ROLES - Used in Agent.role
enum AgentRole {
  COORDINATOR = 'COORDINATOR',          // Task routing, planning
  TRADING_LEAD = 'TRADING_LEAD',        // Strategy, execution
  FULLSTACK_DEV = 'FULLSTACK_DEV',      // Frontend, backend
  INFRASTRUCTURE = 'INFRASTRUCTURE',    // CI/CD, deployment
  SECURITY_QA = 'SECURITY_QA',          // Code review, security
  RESEARCHER = 'RESEARCHER',            // Research tasks
  CUSTOM = 'CUSTOM',                    // Custom role
}

// AGENT STATES - Used in Agent.status
enum AgentStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

// TASK TYPES - Used in Task.type
enum TaskType {
  FEATURE = 'FEATURE',
  BUG = 'BUG',
  TRADING_STRATEGY = 'TRADING_STRATEGY',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SECURITY = 'SECURITY',
  RESEARCH = 'RESEARCH',
  DOCUMENTATION = 'DOCUMENTATION',
  DEPLOYMENT = 'DEPLOYMENT',
  ANALYSIS = 'ANALYSIS',
  COORDINATION = 'COORDINATION',
  TESTING = 'TESTING',
  CODE_REVIEW = 'CODE_REVIEW',
}

// TASK PRIORITIES - Used in Task.priority
enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// BLOCKER TYPES - Used in Task.blockerType
enum BlockerType {
  DEPENDENCY_UNMET = 'DEPENDENCY_UNMET',
  HUMAN_APPROVAL_PENDING = 'HUMAN_APPROVAL_PENDING',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  FAILING_TESTS = 'FAILING_TESTS',
  INFRA_UNAVAILABLE = 'INFRA_UNAVAILABLE',
  AMBIGUOUS_REQUIREMENTS = 'AMBIGUOUS_REQUIREMENTS',
  RISK_THRESHOLD_EXCEEDED = 'RISK_THRESHOLD_EXCEEDED',
  EXTERNAL_DEPENDENCY = 'EXTERNAL_DEPENDENCY',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
}
```

### Result Type Pattern

**ALL service methods MUST return `Result<T, Error>`**

```typescript
import { Result } from '@/types/domain';

// Service method signature pattern:
async methodName(input: InputType): Promise<Result<OutputType, Error>> {
  try {
    // ... logic
    return Result.ok(data);
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Usage:
const result = await service.methodName(input);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}

// Or use unwrap (throws if error):
const data = result.unwrap();
```

### Domain Error Types

```typescript
// Use these specific error types for different failure modes:

// 1. StateTransitionError - Invalid state machine transition
throw new StateTransitionError(
  'TASK',           // resource type
  taskId,           // resource ID
  currentStatus,    // from state
  newStatus,        // to state
  'Reason message'  // why it failed
);

// 2. ValidationError - Input validation failed
throw new ValidationError('Field name', 'Error message');

// 3. DependencyError - Dependency resolution failed
throw new DependencyError(taskId, 'Dependency not met');

// 4. AuthorizationError - Permission denied
throw new AuthorizationError('Action not permitted');
```

---

## Naming Conventions

### Files

| Layer | Pattern | Example |
|-------|---------|---------|
| Services | `[name].service.ts` | `task.service.ts` |
| State Machines | `[name].machine.ts` | `task.machine.ts` |
| Hooks | `use[Name].ts` | `useTasks.ts` |
| Components | `PascalCase.tsx` | `TaskBoard.tsx` |
| Types | `domain.ts`, `api.ts` | `types/domain.ts` |
| Utils | `camelCase.ts` | `api-utils.ts` |

### Variables & Functions

```typescript
// Services: PascalCase class names
class TaskService { }
class AgentService { }

// Methods: camelCase, descriptive
async getTaskById(taskId: string) { }
async listTasksWithFilters(filters: TaskFilters) { }

// Private methods: camelCase with underscore prefix (not enforced)
private _calculateMetrics() { }

// Types: PascalCase, descriptive
interface CreateTaskInput { }
type TaskStatus = 'QUEUED' | 'READY' | ...

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const PRIORITY_WEIGHTS = { ... };

// Enums: PascalCase values
enum TaskStatus {
  QUEUED = 'QUEUED',
  READY = 'READY',
}

// Database fields: camelCase (Prisma maps to snake_case)
interface Task {
  id: string;
  createdAt: Date;
  isDeleted: boolean;
}
```

### Database Naming

```prisma
// Table names: plural, snake_case
@@map("tasks")
@@map("agent_heartbeats")

// Column names: camelCase in Prisma, snake_case in DB
// Prisma handles the mapping automatically
id          String   @id @default(cuid())
createdAt   DateTime @default(now())  // becomes created_at in DB
isDeleted   Boolean  @default(false)  // becomes is_deleted in DB
```

---

## State Machines

### Task State Machine

**File:** `src/core/state-machines/task.machine.ts`

The task state machine is the SINGLE SOURCE OF TRUTH for valid task transitions.

```typescript
// Valid state transitions:
const transitions = {
  QUEUED: {
    DEPENDENCIES_MET: 'READY',
    CANCEL: 'CANCELED',
  },
  READY: {
    ASSIGNED: 'ASSIGNED',
    CANCEL: 'CANCELED',
  },
  ASSIGNED: {
    STARTED: 'RUNNING',
    UNASSIGNED: 'READY',
    CANCEL: 'CANCELED',
  },
  RUNNING: {
    COMPLETED: 'AWAITING_VALIDATION',
    BLOCKED: 'BLOCKED',
    FAILED: 'FAILED',
    CANCEL: 'CANCELED',
  },
  AWAITING_VALIDATION: {
    VALIDATED: 'COMPLETE',
    REJECTED: 'RUNNING',  // Send back for more work
    FAILED: 'FAILED',
  },
  BLOCKED: {
    UNBLOCKED: 'RUNNING',
    CANCEL: 'CANCELED',
  },
  FAILED: {
    RETRY: 'RUNNING',
    CANCEL: 'CANCELED',
  },
  COMPLETE: {},  // Terminal state
  CANCELED: {},  // Terminal state
};

// Usage:
const machine = createTaskStateMachine(taskId, currentStatus, context);

// Check if transition is valid
if (machine.canTransition({ type: 'STARTED' })) {
  // Valid transition
}

// Execute transition
const result = machine.transition({ type: 'STARTED' });
if (result.ok) {
  const newState = result.value;
}
```

### Guard Conditions

Guards prevent invalid transitions based on context:

```typescript
interface TaskStateContext {
  assigneeId?: string;           // Must be set for ASSIGNED → RUNNING
  dependencies: string[];        // Must be empty for QUEUED → READY
  unmetDependencies: string[];   // Must be empty
  retryCount: number;            // Must be < maxRetries for FAILED → RUNNING
  maxRetries: number;
}
```

**CRITICAL:** Always check guards before allowing transitions in UI or API.

---

## Service Layer Patterns

### Service Structure

**File:** `src/services/[name].service.ts`

```typescript
/**
 * [Name] Service
 * 
 * Handles all [name]-related business logic including:
 * - [list responsibilities]
 */

import { PrismaClient, ... } from '@prisma/client';
import { Result, ... } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface [Name]ServiceDependencies {
  prisma: PrismaClient;
}

export interface Create[Name]Input {
  // ... fields
}

export interface Update[Name]Input {
  // ... optional fields
}

// ============================================================================
// SERVICE
// ============================================================================

export class [Name]Service {
  constructor(private deps: [Name]ServiceDependencies) {}

  // CRUD Methods
  async get[Name](id: string): Promise<Result<...>> { }
  async list[Name]s(options?: {...}): Promise<Result<...>> { }
  async create[Name](input: Create[Name]Input): Promise<Result<...>> { }
  async update[Name](id: string, input: Update[Name]Input, actorId: string, actorHandle: string): Promise<Result<...>> { }
  async delete[Name](id: string, actorId: string, actorHandle: string): Promise<Result<void>> { }

  // Business Logic Methods
  async performAction(...): Promise<Result<...>> { }
}
```

### Service Rules

1. **Always return `Result<T, Error>`**
2. **Always include actor info for mutations** (`actorId`, `actorHandle`)
3. **Always broadcast events for state changes**
4. **Always log actions to audit log**
5. **Use state machines for status transitions**
6. **Validate permissions before mutations**

### Service Factory

**File:** `src/services/factory.ts`

```typescript
// Use the factory to get properly initialized services
import { getServices } from '@/services/factory';

const { taskService, agentService, projectService } = getServices();

// In API routes:
import { getServices } from '@/services';

export async function GET() {
  const { taskService } = getServices();
  const result = await taskService.listTasks({ ... });
  // ...
}
```

---

## API Layer Patterns

### API Client

**File:** `src/lib/api.ts`

```typescript
// Use the pre-configured api client for all HTTP requests
import { api, endpoints } from '@/lib/api';

// GET request
const { data, error } = await api.get(endpoints.tasks.list({ status: 'RUNNING' }));

// POST request
const { data, error } = await api.post(endpoints.tasks.create(), {
  title: 'New Task',
  description: 'Task description',
  projectId: 'proj_123',
  priority: 'HIGH',
  type: 'FEATURE',
});

// PATCH request
const { data, error } = await api.patch(endpoints.tasks.update(taskId), {
  status: 'RUNNING',
});
```

### API Route Pattern

**File:** `src/app/api/[resource]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { getServices } from '@/services';
import { Result } from '@/types/domain';

// GET /api/tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | undefined;
    
    const { taskService } = getServices();
    const result = await taskService.listTasks({
      page: 1,
      limit: 20,
      status,
    });

    if (!result.ok) {
      return Response.json({ error: result.error.message }, { status: 400 });
    }

    return Response.json(result.value);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskService } = getServices();
    
    // Get actor info from session/auth
    const actorId = '...';  // From auth context
    const actorHandle = '...';
    
    const result = await taskService.createTask({
      ...body,
      creatorId: actorId,
      creatorHandle: actorHandle,
    });

    if (!result.ok) {
      return Response.json({ error: result.error.message }, { status: 400 });
    }

    return Response.json(result.value, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## React Query Hooks

### Hook Pattern

**Files:** `src/hooks/use[Name].ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

// Query Hook - Fetch data
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async () => {
      const { data, error } = await api.get(endpoints.tasks.list(filters));
      if (error) throw error;
      return data;
    },
  });
}

// Query Hook - Fetch single item
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await api.get(endpoints.tasks.get(taskId));
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

// Mutation Hook - Create/Update/Delete
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await api.post(endpoints.tasks.create(), input);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      // Or optimistic update
      queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
    },
  });
}
```

### Query Keys

**File:** `src/lib/query-client.ts`

```typescript
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters | undefined) => 
      [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string | null) => 
      [...queryKeys.tasks.details(), id] as const,
  },
  agents: {
    all: ['agents'] as const,
    // ... similar pattern
  },
  projects: {
    all: ['projects'] as const,
    // ... similar pattern
  },
};
```

### Hook Usage in Components

```typescript
import { useTasks, useCreateTask } from '@/hooks/useTasks';

function TaskList() {
  const { data, isLoading, error } = useTasks({ status: 'RUNNING' });
  const createTask = useCreateTask();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {data?.tasks.map(task => <TaskCard key={task.id} task={task} />)}
      <button onClick={() => createTask.mutate({ title: 'New Task', ... })}>
        Create Task
      </button>
    </div>
  );
}
```

---

## Error Handling

### Error Hierarchy

```
Error
├── DomainError (abstract base)
│   ├── StateTransitionError
│   ├── ValidationError
│   ├── DependencyError
│   └── AuthorizationError
├── ApiClientError
├── NetworkError
└── DatabaseError (from Prisma)
```

### Error Handling Pattern

```typescript
// In services:
try {
  // ... database operation
  return Result.ok(data);
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle known Prisma errors
    if (error.code === 'P2025') {
      return Result.err(new Error('Record not found'));
    }
  }
  return Result.err(error instanceof Error ? error : new Error(String(error)));
}

// In API routes:
const result = await service.method();
if (!result.ok) {
  // Log for debugging
  console.error('Service error:', result.error);
  
  // Return appropriate HTTP status
  if (result.error instanceof ValidationError) {
    return Response.json({ error: result.error.message }, { status: 400 });
  }
  if (result.error instanceof StateTransitionError) {
    return Response.json({ error: result.error.message }, { status: 409 }); // Conflict
  }
  if (result.error instanceof AuthorizationError) {
    return Response.json({ error: result.error.message }, { status: 403 });
  }
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

// In components:
const { data, error, isError } = useTasks();

if (isError) {
  return <ErrorDisplay message={error.message} />;
}
```

---

## Event System

### Event Broadcasting

**File:** `src/lib/events.ts`

```typescript
// Broadcast events for real-time updates
import { broadcastEvent } from '@/lib/events';

// After state-changing operation:
broadcastEvent({
  type: 'TASK_CREATED',
  taskId: task.id,
  projectId: task.projectId,
  data: task,
});

// Event types:
type DomainEvent =
  | { type: 'TASK_CREATED'; taskId: string; projectId: string; data: Task }
  | { type: 'TASK_UPDATED'; taskId: string; projectId: string; changes: Partial<Task> }
  | { type: 'TASK_STATUS_CHANGED'; taskId: string; from: TaskStatus; to: TaskStatus }
  | { type: 'TASK_ASSIGNED'; taskId: string; agentId: string }
  | { type: 'TASK_BLOCKED'; taskId: string; blockerType: BlockerType; reason: string }
  | { type: 'TASK_UNBLOCKED'; taskId: string; resolution: string }
  | { type: 'AGENT_HEARTBEAT'; agentId: string; data: AgentHeartbeat }
  | { type: 'AGENT_STATUS_CHANGED'; agentId: string; data: { status: AgentStatus } }
  | { type: 'PROJECT_CREATED'; projectId: string; data: Project }
  | { type: 'PROJECT_STATE_CHANGED'; projectId: string; from: ProjectState; to: ProjectState };
```

### Event Consumption

**File:** `src/hooks/useEvents.ts`

```typescript
import { useEvents } from '@/hooks/useEvents';

function RealtimeTaskList() {
  const queryClient = useQueryClient();
  
  useEvents({
    onTaskCreated: (event) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onTaskUpdated: (event) => {
      queryClient.setQueryData(
        queryKeys.tasks.detail(event.taskId),
        event.data
      );
    },
  });
  
  // ...
}
```

---

## Component Dependencies

### Service Dependencies

```
TaskService
├── PrismaClient
├── TaskStateMachine (for status transitions)
├── broadcastEvent
└── logAction

AgentService
├── PrismaClient
├── broadcastEvent
└── logAction

ProjectService
├── PrismaClient
├── DependencyResolver (for dependency graphs)
├── broadcastEvent
└── logAction

DispatchService
├── PrismaClient
├── AgentDispatcher (scoring algorithm)
└── broadcastEvent
```

### Core Dependencies

```
TaskStateMachine
└── Result type

DependencyResolver
├── DependencyGraphBuilder
└── Result type

AgentDispatcher
└── Result type
```

### Hook Dependencies

```
useTasks
├── api client
├── queryKeys
└── Task type

useAgents
├── api client
├── queryKeys
└── Agent type

useProjects
├── api client
├── queryKeys
└── Project type
```

### API Route Dependencies

```
/api/tasks
├── TaskService
└── getServices factory

/api/agents
├── AgentService
└── getServices factory

/api/projects
├── ProjectService
└── getServices factory

/api/dispatch
├── DispatchService
└── getServices factory
```

---

## Database Schema Reference

### Key Tables

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `portfolios` | Strategic containers | has many projects |
| `projects` | Managed initiatives | belongs to portfolio, has many tasks |
| `milestones` | Outcome checkpoints | belongs to project, has many tasks |
| `tasks` | Work units | belongs to project/milestone, belongs to agent |
| `agents` | Worker profiles | has many tasks, has many timeLogs |
| `timeLogs` | Time tracking | belongs to task and agent |
| `positions` | Trading positions | has many orders |
| `orders` | Trading orders | belongs to position |
| `decisions` | Recorded judgments | belongs to project |
| `risks` | Tracked threats | belongs to project |
| `artifacts` | Task outputs | belongs to project/task |
| `audit_logs` | Immutable action log | - |
| `events` | Event store | - |

### Important Fields

**Task.soft delete:**
- `isDeleted: Boolean` - Marked true for soft delete
- `deletedAt: DateTime?` - When deleted
- Queries should always include `where: { isDeleted: false }`

**Task.statusHistory:**
- JSON array tracking all status changes
- Format: `{ status, timestamp, actor, reason }[]`

**Task.dependencies / Task.dependents:**
- String arrays of task IDs
- Used by dependency resolver

---

## Checklist for Sub-Agents

When writing code for Mission Control, verify:

- [ ] All service methods return `Result<T, Error>`
- [ ] All mutations include actorId and actorHandle
- [ ] All state changes use the state machine
- [ ] All mutations broadcast events
- [ ] All mutations log to audit log
- [ ] All database queries filter by `isDeleted: false`
- [ ] All API routes handle errors with appropriate HTTP status codes
- [ ] All React Query hooks use proper query keys
- [ ] All enum values match the database schema
- [ ] All types are imported from `@/types/domain` or `@prisma/client`
- [ ] All file names follow naming conventions
- [ ] All dependencies are declared in imports

---

## Common Pitfalls

### ❌ DON'T

```typescript
// Don't use any
const data: any = await fetchData();

// Don't throw in services - return Result
if (!valid) {
  throw new Error('Invalid');  // ❌
}

// Don't mutate state machine directly
task.status = 'RUNNING';  // ❌ Bypasses state machine

// Don't forget soft delete filter
const tasks = await prisma.task.findMany();  // ❌ Includes deleted

// Don't use wrong status values
const status = 'DONE';  // ❌ Use 'COMPLETE'
```

### ✅ DO

```typescript
// Use proper types
const data: Task = await fetchData();

// Return Result from services
if (!valid) {
  return Result.err(new Error('Invalid'));  // ✅
}

// Use state machine for transitions
const machine = createTaskStateMachine(taskId, task.status, context);
const result = machine.transition({ type: 'STARTED' });  // ✅

// Always filter soft deletes
const tasks = await prisma.task.findMany({
  where: { isDeleted: false },  // ✅
});

// Use correct enum values
const status = TaskStatus.COMPLETE;  // ✅
```

---

**End of Specification**

For questions or clarifications, reference:
- `prisma/schema.prisma` for database schema
- `src/types/domain.ts` for domain types
- `src/core/state-machines/task.machine.ts` for state transitions
- `src/services/*.service.ts` for service patterns
