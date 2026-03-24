# Mission Control - Engineering Roadmap

## Current State vs Target Architecture

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Database Schema | ✅ Comprehensive | ✅ Comprehensive | Done |
| API Layer | ⚠️ Basic CRUD | 🎯 Domain-driven, event-sourced | In Progress |
| State Machines | ❌ Schema only | 🎯 Enforced transitions | Not Started |
| Dependency Engine | ❌ Not implemented | 🎯 Auto-resolution | Not Started |
| Agent Dispatcher | ❌ Not implemented | 🎯 Intelligent scoring | Not Started |
| Validation Gates | ❌ Not implemented | 🎯 AC enforcement | Not Started |
| Approval Queue | ❌ Not implemented | 🎯 Human-in-the-loop | Not Started |
| Event Sourcing | ⚠️ Partial | 🎯 Full audit trail | Not Started |
| Testing | ❌ None | 🎯 >80% coverage | Not Started |
| Observability | ❌ None | 🎯 Metrics + tracing | Not Started |

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Structure Reorganization

```
src/
├── core/                          # Domain logic (framework-agnostic)
│   ├── state-machines/
│   │   ├── project.machine.ts
│   │   ├── task.machine.ts
│   │   └── milestone.machine.ts
│   ├── dependency-engine/
│   │   ├── resolver.ts
│   │   └── graph-builder.ts
│   ├── dispatcher/
│   │   ├── scoring.ts
│   │   └── assignment.ts
│   └── validation/
│       ├── criteria-checker.ts
│       └── gates.ts
├── infrastructure/                # External concerns
│   ├── persistence/
│   │   ├── repositories/
│   │   └── prisma-extensions.ts
│   ├── messaging/
│   │   ├── event-bus.ts
│   │   └── discord-client.ts
│   ├── audit/
│   │   └── logger.ts
│   └── security/
│       ├── rbac.ts
│       └── api-keys.ts
├── api/                           # API layer (Next.js routes)
│   ├── routes/                    # Route handlers
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   └── validators/
├── services/                      # Business logic
│   ├── project-service.ts
│   ├── task-service.ts
│   ├── agent-service.ts
│   └── dispatch-service.ts
└── types/                         # Shared types
    ├── domain.ts
    └── api.ts
```

### 1.2 Core Domain Types

```typescript
// Domain events - immutable facts
type DomainEvent = 
  | { type: 'TASK_CREATED'; payload: TaskCreatedPayload }
  | { type: 'TASK_ASSIGNED'; payload: TaskAssignedPayload }
  | { type: 'TASK_STATUS_CHANGED'; payload: StatusChangePayload }
  | { type: 'BLOCKER_RAISED'; payload: BlockerPayload }
  | { type: 'DEPENDENCY_RESOLVED'; payload: DependencyPayload };

// State machines with type safety
interface StateMachine<S extends string, E extends string> {
  state: S;
  transitions: Record<S, Partial<Record<E, S>>>;
  can(event: E): boolean;
  transition(event: E): Result<S, TransitionError>;
}
```

### 1.3 Testing Infrastructure

```
__tests__/
├── unit/                          # Fast, isolated tests
│   ├── core/
│   │   ├── state-machines.test.ts
│   │   └── dependency-engine.test.ts
│   └── services/
├── integration/                   # API + database tests
│   ├── api/
│   └── workflows/
└── e2e/                          # Full browser tests
    └── critical-paths.test.ts
```

---

## Phase 2: State Machines & Dependencies (Week 3-4)

### 2.1 Strict State Machine Enforcement

```typescript
// Task state machine with business rules
const TaskStateMachine = {
  initial: 'QUEUED',
  states: {
    QUEUED: {
      on: { 
        DEPENDENCIES_MET: { target: 'READY', guard: 'hasNoBlockers' }
      }
    },
    READY: {
      on: { 
        ASSIGNED: { target: 'ASSIGNED', action: 'recordAssignment' }
      }
    },
    ASSIGNED: {
      on: { 
        STARTED: { target: 'RUNNING', guard: 'agentIsOnline' },
        UNASSIGNED: { target: 'READY' }
      }
    },
    RUNNING: {
      on: {
        COMPLETED: { target: 'AWAITING_VALIDATION', guard: 'outputsPresent' },
        BLOCKED: { target: 'BLOCKED', action: 'notifyStakeholders' },
        FAILED: { target: 'FAILED', action: 'incrementRetryCount' }
      }
    },
    // ... etc
  }
};
```

### 2.2 Dependency Resolution Engine

```typescript
// Topological sort for task DAG
interface DependencyResolver {
  // Build graph from task dependencies
  buildGraph(tasks: Task[]): DependencyGraph;
  
  // Find all tasks that are now READY
  findUnblockedTasks(graph: DependencyGraph): Task[];
  
  // Detect cycles (should never happen, but guard against)
  detectCycles(graph: DependencyGraph): Cycle[];
  
  // When task T completes, what becomes ready?
  getUnblockedByCompletion(taskId: string): Task[];
}
```

---

## Phase 3: Agent Dispatch & Validation (Week 5-6)

### 3.1 Intelligent Dispatch Scoring

```typescript
// Scoring algorithm for task assignment
interface DispatchScore {
  taskId: string;
  agentId: string;
  score: number;
  breakdown: {
    capabilityMatch: number;  // 0-1
    availability: number;     // 0-1
    historicalSuccess: number; // 0-1
    costEfficiency: number;   // 0-1
    priorityAlignment: number; // 0-1
  };
}

function calculateDispatchScore(
  task: Task, 
  agent: Agent,
  context: PortfolioContext
): DispatchScore;
```

### 3.2 Validation Gates

```typescript
// Acceptance criteria enforcement
interface ValidationGate {
  type: 'CODE_REVIEW' | 'TESTS_PASS' | 'SECURITY_SCAN' | 'HUMAN_APPROVAL';
  check(task: Task): Promise<ValidationResult>;
}

// Gate chain - all must pass
const DeploymentGate: ValidationGate[] = [
  CodeReviewGate,
  TestGate,
  SecurityScanGate,
  ProductionApprovalGate
];
```

---

## Phase 4: Production Hardening (Week 7-8)

### 4.1 Event Sourcing & Audit

```typescript
// All state changes via events
interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getStream(aggregateId: string): Promise<DomainEvent[]>;
  replay(aggregateId: string, upTo?: Date): Promise<AggregateState>;
}

// Immutable audit log
interface AuditLogger {
  log(context: RequestContext, action: string, result: unknown): void;
  query(filter: AuditFilter): Promise<AuditEntry[]>;
}
```

### 4.2 Observability

```typescript
// Structured logging
const logger = createLogger({
  service: 'mission-control',
  includeTraceId: true,
  redact: ['apiKey', 'password']
});

// Metrics
const metrics = {
  taskCompletionTime: histogram('task_completion_seconds'),
  dispatchLatency: gauge('dispatch_latency_ms'),
  activeBlockers: counter('active_blockers'),
  agentUtilization: gauge('agent_utilization_percent')
};
```

### 4.3 Error Handling

```typescript
// Result type for explicit error handling
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Domain errors with context
class TaskTransitionError extends DomainError {
  constructor(
    public taskId: string,
    public from: TaskStatus,
    public to: TaskStatus,
    public reason: string
  ) {
    super(`Cannot transition task ${taskId} from ${from} to ${to}: ${reason}`);
  }
}
```

---

## Engineering Standards

### Code Quality
- **TypeScript**: Strict mode, no `any`
- **Testing**: Unit tests for all core logic, integration tests for APIs
- **Linting**: ESLint + Prettier, enforced in CI
- **Documentation**: TSDoc for all public APIs

### Architecture Principles
1. **Domain-Driven Design**: Core logic is framework-agnostic
2. **Event Sourcing**: All state changes are events
3. **CQRS**: Read models optimized for queries
4. **Dependency Injection**: Testable, swappable components

### Security
- Input validation with Zod on all APIs
- RBAC for all operations
- API key rotation support
- Secrets in environment only

### Performance
- Database query optimization (explain analyze)
- Connection pooling
- Redis for session/cache
- Rate limiting

---

## Implementation Priority

### P0 (Critical Path)
1. State machine enforcement
2. Dependency resolution
3. Basic dispatch scoring
4. Event audit logging

### P1 (Important)
1. Validation gates
2. Human approval queue
3. Agent heartbeat monitoring
4. Discord integration

### P2 (Nice to Have)
1. Advanced forecasting
2. ML-based dispatch optimization
3. Real-time collaboration features
