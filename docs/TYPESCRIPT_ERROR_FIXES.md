# TypeScript Error Fix Guide

**Purpose:** Common TypeScript errors in Mission Control and how to fix them

---

## Fix Log

### 2026-03-25: AuditLogCreateInput type mismatch (src/lib/audit.ts)
**Error:** `error TS2322: Type '{ ... }' is not assignable to type 'AuditLogCreateInput'`
**Fix:** Added `Prisma.InputJsonValue` cast for `beforeState` and `afterState` fields in `logAction` function. Also added `Prisma` to the import from `@prisma/client`.

### 2026-03-25: ActiveProjects.tsx UseQueryResult property errors
**Errors:**
- Property 'projects' does not exist on type 'UseQueryResult'
- Property 'loading' does not exist on type 'UseQueryResult'
- Implicit 'any' types on filter/map callbacks
**Fix:** Changed destructuring from `{ projects, loading }` to `{ data: projects, isLoading }` and added explicit type annotations for callback parameters.

---

## Error 1: "DONE" vs "COMPLETE" (Most Common)

### Error
\`\`\`
Type '"DONE"' is not assignable to type 'TaskStatus'
\`\`\`

### Problem
Using wrong status value. Valid values are:
- QUEUED, READY, ASSIGNED, RUNNING
- AWAITING_VALIDATION, BLOCKED, FAILED
- COMPLETE (not DONE)
- CANCELED (not CANCELLED)

### Fix
\`\`\`typescript
// ❌ Wrong
const status: TaskStatus = 'DONE';
await prisma.task.update({ data: { status: 'DONE' } });

// ✅ Correct
const status: TaskStatus = 'COMPLETE';
await prisma.task.update({ data: { status: 'COMPLETE' } });
\`\`\`

### Reference
See PROJECT_SPECIFICATION.md - Domain Model section for all valid enum values.

---

## Error 2: Result Type Return Mismatch

### Error
\`\`\`
Type 'Result<Task, Error>' is not assignable to type 'Promise<Task>'
\`\`\`

### Problem
Not properly unwrapping the Result type.

### Fix
\`\`\`typescript
// ❌ Wrong - returning Result directly
async function getTask(id: string): Promise<Task> {
  return taskService.getTask(id);  // Returns Result<Task, Error>
}

// ✅ Correct - unwrap the Result
async function getTask(id: string): Promise<Task> {
  const result = await taskService.getTask(id);
  if (!result.ok) {
    throw result.error;  // Or handle gracefully
  }
  return result.value;
}

// ✅ Alternative - propagate Result
async function getTask(id: string): Promise<Result<Task, Error>> {
  return taskService.getTask(id);
}
\`\`\`

---

## Error 3: Missing isDeleted Filter

### Error
Soft-deleted tasks appearing in results (logical error, not TypeScript)

### Fix
\`\`\`typescript
// ❌ Wrong - includes deleted tasks
const tasks = await prisma.task.findMany({
  where: { status: 'RUNNING' },
});

// ✅ Correct - exclude deleted tasks
const tasks = await prisma.task.findMany({
  where: { 
    status: 'RUNNING',
    isDeleted: false,  // ALWAYS include this
  },
});
\`\`\`

---

## Error 4: Prisma Input Types

### Error
\`\`\`
Type 'string[]' is not assignable to type 'Prisma.InputJsonValue'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
await prisma.task.create({
  data: {
    tags: ['urgent', 'bug'],
    dependencies: ['task_1', 'task_2'],
  },
});

// ✅ Correct - cast to InputJsonValue
import { Prisma } from '@prisma/client';

await prisma.task.create({
  data: {
    tags: ['urgent', 'bug'],
    dependencies: ['task_1', 'task_2'] as Prisma.InputJsonValue,
    outputs: { url: '...' } as Prisma.InputJsonValue,
  },
});
\`\`\`

---

## Error 5: Date vs DateTime

### Error
\`\`\`
Type 'Date' is not assignable to type 'string'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
const task = await prisma.task.findUnique({ where: { id } });
const date: string = task.createdAt;  // createdAt is Date

// ✅ Correct
const task = await prisma.task.findUnique({ where: { id } });
const date: Date = task.createdAt;
const isoString: string = task.createdAt.toISOString();
\`\`\`

---

## Error 6: Enum Import Issues

### Error
\`\`\`
Cannot find name 'TaskStatus'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong - not imported
const status: TaskStatus = 'COMPLETE';

// ✅ Correct - import from @prisma/client
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';

const status: TaskStatus = 'COMPLETE';
\`\`\`

---

## Error 7: API Route Response Types

### Error
\`\`\`
Argument of type '{ error: string; }' is not assignable to parameter of type 'BodyInit'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
return new Response({ error: 'Not found' }, { status: 404 });

// ✅ Correct
return Response.json({ error: 'Not found' }, { status: 404 });
// or
return new Response(JSON.stringify({ error: 'Not found' }), {
  status: 404,
  headers: { 'Content-Type': 'application/json' },
});
\`\`\`

---

## Error 8: Query Key Type Issues

### Error
\`\`\`
Type 'string | null' is not assignable to type 'string'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
export const queryKeys = {
  tasks: {
    detail: (id: string | null) => ['tasks', 'detail', id],  // null in array
  },
};

// ✅ Correct
export const queryKeys = {
  tasks: {
    detail: (id: string | null) => 
      id ? ['tasks', 'detail', id] : ['tasks', 'detail'],
  },
};
\`\`\`

---

## Error 9: Missing Type Parameters

### Error
\`\`\`
Type parameter 'T' has no default value
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
const result = Result.ok(data);  // T is inferred

// ✅ Correct - explicit type
const result = Result.ok<Task>(data);

// For useQuery
const { data } = useQuery({  // data is unknown
  queryKey: ['task'],
  queryFn: fetchTask,
});

// ✅ Correct
const { data } = useQuery<Task>({  // data is Task
  queryKey: ['task'],
  queryFn: fetchTask,
});
\`\`\`

---

## Error 10: Service Dependencies

### Error
\`\`\`
Property 'prisma' does not exist on type '{}'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong - missing type annotation
const service = new TaskService({ prisma });

// ✅ Correct - use interface
import { TaskService } from '@/services/task.service';

const service = new TaskService({ prisma });
// Constructor expects TaskServiceDependencies
\`\`\`

---

## Error 11: Nullable vs Optional

### Error
\`\`\`
Type 'null' is not assignable to type 'undefined'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
interface UpdateTaskInput {
  assigneeId?: string | null;  // Optional AND nullable
}

function update(input: UpdateTaskInput) {
  const id: string | undefined = input.assigneeId;  // Wrong!
}

// ✅ Correct
function update(input: UpdateTaskInput) {
  const id: string | null | undefined = input.assigneeId;
  // or
  if (input.assigneeId === null) {
    // Explicitly setting to null (unassign)
  } else if (input.assigneeId === undefined) {
    // Not provided (keep current)
  }
}
\`\`\`

---

## Error 12: State Machine Context

### Error
\`\`\`
Property 'assigneeId' is missing in type '{}'
\`\`\`

### Fix
\`\`\`typescript
// ❌ Wrong
const machine = createTaskStateMachine(taskId, 'ASSIGNED', {
  dependencies: [],
  unmetDependencies: [],
  retryCount: 0,
  maxRetries: 3,
  // Missing assigneeId!
});

// ✅ Correct
const machine = createTaskStateMachine(taskId, 'ASSIGNED', {
  assigneeId: task.assigneeId || undefined,
  dependencies: task.dependencies as string[],
  unmetDependencies: [],
  retryCount: task.retryCount,
  maxRetries: 3,
});
\`\`\`

---

## Quick Fix Checklist

When you see a TypeScript error:

- [ ] Check enum values match PROJECT_SPECIFICATION.md
- [ ] Check Result types are properly unwrapped
- [ ] Check isDeleted: false is in Prisma queries
- [ ] Check Prisma InputJsonValue casts for JSON fields
- [ ] Check Date types (not string)
- [ ] Check imports from @prisma/client
- [ ] Check Response.json() for API routes
- [ ] Check query keys handle nulls
- [ ] Check generic type parameters
- [ ] Check service dependency types

---

## Error 13: Map/Set Iteration (TS2802)

### Error
```
Type 'Map<string, DependencyNode>' can only be iterated through when using 
the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

### Problem
TypeScript cannot iterate over Map/Set types even with target: es2015.

### Fix
Add `downlevelIteration: true` to tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "es2015",
    "downlevelIteration": true,
    // ...
  }
}
```

### Files Affected
- src/core/dependency-engine/resolver.ts
- src/infrastructure/audit/logger.ts
- src/infrastructure/messaging/event-bus.ts

---

## After Fixing

**REMEMBER:** After each fix, update the relevant documentation:

1. If you fix a type error → Update PROJECT_SPECIFICATION.md if the type definition was wrong
2. If you fix API route → Update docs/components/API_ROUTES.md
3. If you fix hooks → Update docs/components/REACT_QUERY_HOOKS.md
4. If you fix state machine usage → Update docs/components/TASK_STATE_MACHINE.md

**NO EXCEPTIONS.** Future agents depend on accurate docs.



---

## Fix Log

### 2026-03-25 - dispatch.service.ts TypeScript Errors

**Errors Fixed:**
1. TS2353: priority does not exist in type ProjectSelect (lines 77, 211)
2. TS2339: Property maxConcurrentTasks does not exist on type Agent (lines 108, 245, 346, 355)
3. TS2551: Property project does not exist on type (line 235)

**Root Causes:**
1. Project model does not have a priority field - priority exists only on Task model
2. Agent model uses maxLoad not maxConcurrentTasks per Prisma schema
3. The project relation was using priority field that does not exist

**Fixes Applied:**
1. Changed include: { project: { select: { priority: true } } } to include: { project: { select: { id: true, name: true } } }
2. Changed all a.maxConcurrentTasks to a.maxLoad
3. Changed t.project?.priority to default value 50 since Project has no priority field

**Verification:**
npx tsc --noEmit src/services/dispatch.service.ts
Original errors resolved. Remaining errors are module resolution issues from running tsc on single file.

---

## Fix Log

### 2026-03-25 - project.service.ts Fixes

Fixed 3 TypeScript errors in src/services/project.service.ts:

1. Line 166 - TS2322: Cast successMetrics to Prisma.InputJsonValue
   Before: successMetrics: input.successMetrics,
   After: successMetrics: input.successMetrics as Prisma.InputJsonValue,

2. Line 228 - TS2322: Cast objectives to Prisma.InputJsonValue
   Before: updateData.objectives = input.objectives;
   After: updateData.objectives = input.objectives as Prisma.InputJsonValue;

3. Line 470 - TS2353: Removed metadata from logAction call
   metadata property not part of AuditLogInput type

---

## Fix Log - 2026-03-25

### Fixed Errors in src/services/task.service.ts

1. **Error TS2353: 'dependencies' does not exist in type 'TaskInclude'**
   - File: src/services/task.service.ts (line 128)
   - Fix: Removed `dependencies` from `include` clause since it's a JSON field, not a relation
   - Also removed `dependents` (line 128 after first fix) for the same reason

2. **Error TS2322: Type 'Record<string, unknown>' is not assignable to type 'InputJsonValue'**
   - File: src/services/task.service.ts (line 369)
   - Fix: Cast `input.actualOutputs` to `Prisma.InputJsonValue`
   - Before: `updateData.actualOutputs = input.actualOutputs;`
   - After: `updateData.actualOutputs = input.actualOutputs as Prisma.InputJsonValue;`

3. **Error TS2551: Property 'assigneeId' does not exist on type 'TaskUpdateInput'**
   - File: src/services/task.service.ts (lines 409, 419)
   - Fix: Changed from direct foreign key assignment to Prisma relation syntax
   - Before: `updateData.assigneeId = input.assigneeId;`
   - After: `updateData.assignee = { connect: { id: input.assigneeId } };`
   - Before: `updateData.assigneeId = null;`
   - After: `updateData.assignee = { disconnect: true };`

4. **Error TS2339: Property 'creatorId' does not exist on type**
   - File: src/services/task.service.ts (line 474)
   - Fix: Changed `task.creatorId` to `task.createdBy` to match schema field name

5. **Error TS2322: Type 'string' is not assignable to type 'BlockerType'**
   - File: src/services/task.service.ts (line 537)
   - Fix: Cast `input.blockerType` to `BlockerType` enum
   - Before: `blockerType: input.blockerType,`
   - After: `blockerType: input.blockerType as BlockerType,`
