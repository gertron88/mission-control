# DependencyResolver Specification

**File:** \`src/core/dependency-engine/resolver.ts\`
**Purpose:** Manages task dependency graphs, detects cycles, finds unblocked tasks
**Dependencies:** \`src/types/domain.ts\`

---

## Overview

The DependencyResolver builds and analyzes task dependency graphs. It determines:
- Which tasks are blocked by unmet dependencies
- Which tasks become unblocked when a task completes
- Whether there are circular dependencies (cycles)
- The critical path through a project

---

## Types

\`\`\`typescript
interface DependencyNode {
  id: string;
  status: TaskStatus;
  dependencies: string[];  // IDs of tasks this task depends on
  dependents: string[];    // IDs of tasks that depend on this task
  estimatedEffort?: number;
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;  // taskId -> set of dependency IDs
}

interface Cycle {
  path: string[];  // Task IDs forming the cycle
}

interface ResolutionResult {
  unblocked: string[];     // Task IDs that are now ready
  stillBlocked: string[];  // Task IDs still blocked
  cycles: Cycle[];         // Detected cycles (should be empty)
}
\`\`\`

---

## Usage

### Building a Graph

\`\`\`typescript
import { DependencyResolver } from '@/core/dependency-engine/resolver';

const resolver = new DependencyResolver();
const tasks = await prisma.task.findMany({
  where: { projectId: 'proj_123', isDeleted: false },
});

const graph = resolver.buildGraph(tasks);
\`\`\`

### Finding Unblocked Tasks

\`\`\`typescript
// Tasks with all dependencies in COMPLETE status
const unblocked = resolver.findUnblockedTasks(graph);
// Returns: string[] - task IDs ready to move to READY status
\`\`\`

### Detecting Cycles

\`\`\`typescript
const cycles = resolver.detectCycles(graph);
if (cycles.length > 0) {
  console.error('Circular dependencies detected:', cycles);
  // Handle error - should never happen with proper UI validation
}
\`\`\`

### Getting Unblocked Tasks After Completion

\`\`\`typescript
// When task_1 completes, which tasks become unblocked?
const newlyUnblocked = resolver.getUnblockedByCompletion(graph, 'task_1');
// Returns: string[] - task IDs that had task_1 as their last unmet dependency
\`\`\`

### Getting Critical Path

\`\`\`typescript
// Longest dependency chain from start to end
const criticalPath = resolver.getCriticalPath(graph);
// Returns: string[] - task IDs in order

// Critical path starting from specific task
const pathFromTask = resolver.getCriticalPath(graph, 'task_123');
\`\`\`

---

## Rules

1. **A task is blocked if any dependency is not COMPLETE**
2. **Cycles are errors** - the system should prevent creating them
3. **Soft-deleted tasks are ignored** when building graphs
4. **A task unblocks dependents only when it reaches COMPLETE status**

---

## Integration

### ProjectService

\`\`\`typescript
async resolveDependencies(
  projectId: string,
  actorId: string,
  actorHandle: string
): Promise<Result<ResolutionResult, Error>> {
  const tasks = await this.deps.prisma.task.findMany({
    where: { projectId, isDeleted: false },
  });

  const resolver = new DependencyResolver();
  const graph = resolver.buildGraph(tasks);
  
  // Check for cycles
  const cycles = resolver.detectCycles(graph);
  if (cycles.length > 0) {
    return Result.err(new DependencyError(
      projectId,
      \`Circular dependencies: \${cycles.map(c => c.path.join(' -> ')).join(', ')}\`
    ));
  }

  // Find unblocked tasks
  const unblocked = resolver.findUnblockedTasks(graph);
  
  // Update status of unblocked QUEUED tasks to READY
  for (const taskId of unblocked) {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'QUEUED') {
      await this.deps.prisma.task.update({
        where: { id: taskId },
        data: { status: 'READY', readyAt: new Date() },
      });
      
      // Broadcast event
      broadcastEvent({
        type: 'TASK_STATUS_CHANGED',
        taskId,
        from: 'QUEUED',
        to: 'READY',
      });
    }
  }

  return Result.ok({
    unblocked,
    stillBlocked: tasks
      .filter(t => t.status === 'QUEUED' || t.status === 'BLOCKED')
      .map(t => t.id)
      .filter(id => !unblocked.includes(id)),
    cycles: [],
  });
}
\`\`\`

### TaskService (on task completion)

\`\`\`typescript
async completeTask(taskId: string, ...): Promise<Result<...>> {
  // ... complete the task
  
  // Check for newly unblocked tasks
  const projectTasks = await this.deps.prisma.task.findMany({
    where: { projectId: task.projectId, isDeleted: false },
  });
  
  const resolver = new DependencyResolver();
  const graph = resolver.buildGraph(projectTasks);
  const newlyUnblocked = resolver.getUnblockedByCompletion(graph, taskId);
  
  // Update newly unblocked tasks to READY
  for (const unblockedId of newlyUnblocked) {
    await this.updateTask(
      unblockedId,
      { status: 'READY' },
      actorId,
      'system'
    );
  }
}
\`\`\`

---

## Algorithm

### Cycle Detection (DFS)

1. For each unvisited node:
   - Mark as visiting
   - Recursively visit all dependencies
   - If we encounter a node marked as visiting, we found a cycle
   - Mark as visited after recursion

### Topological Sort

1. Find all nodes with no unmet dependencies
2. Remove them from graph
3. Repeat until all nodes processed
4. If nodes remain, there's a cycle

### Critical Path

1. Calculate earliest start time for each task (max of dependencies' end times)
2. Calculate latest start time without delaying project
3. Tasks where earliest === latest are on critical path

---

## Testing

\`\`\`typescript
const tasks = [
  { id: 'A', status: 'COMPLETE', dependencies: [] },
  { id: 'B', status: 'QUEUED', dependencies: ['A'] },
  { id: 'C', status: 'QUEUED', dependencies: ['A'] },
  { id: 'D', status: 'QUEUED', dependencies: ['B', 'C'] },
];

const resolver = new DependencyResolver();
const graph = resolver.buildGraph(tasks);

// B and C should be unblocked (A is complete)
expect(resolver.findUnblockedTasks(graph)).toContain('B');
expect(resolver.findUnblockedTasks(graph)).toContain('C');

// D should NOT be unblocked (B and C not complete)
expect(resolver.findUnblockedTasks(graph)).not.toContain('D');

// When B completes, D should still be blocked by C
expect(resolver.getUnblockedByCompletion(graph, 'B')).not.toContain('D');
\`\`\`

