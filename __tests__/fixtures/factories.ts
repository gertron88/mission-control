/**
 * Test Factories
 * 
 * Factory functions for creating test data.
 * Ensures consistent test data across all tests.
 */

import type { 
  TaskStatus, 
  TaskPriority, 
  TaskType,
  AgentRole,
  AgentStatus,
  ProjectState 
} from '../../src/types/domain';

// ============================================================================
// TASK FACTORIES
// ============================================================================

export interface TaskFactoryOptions {
  id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  projectId?: string;
  assigneeId?: string | null;
  dependencies?: string[];
  requiredTools?: string[];
  estimatedEffort?: number;
  projectPriority?: number;
  requiredRole?: AgentRole;
}

export function createTask(options: TaskFactoryOptions = {}): Required<TaskFactoryOptions> {
  return {
    id: options.id ?? `task_${Math.random().toString(36).substr(2, 9)}`,
    title: options.title ?? 'Test Task',
    description: options.description ?? 'A test task for unit tests',
    status: options.status ?? 'QUEUED',
    priority: options.priority ?? 'MEDIUM',
    type: options.type ?? 'FEATURE',
    projectId: options.projectId ?? `proj_${Math.random().toString(36).substr(2, 9)}`,
    assigneeId: options.assigneeId ?? null,
    dependencies: options.dependencies ?? [],
    requiredTools: options.requiredTools ?? [],
    estimatedEffort: options.estimatedEffort ?? 4,
    projectPriority: options.projectPriority ?? 50,
    requiredRole: options.requiredRole ?? 'FULLSTACK_DEV',
  };
}

export function createCriticalTask(options: TaskFactoryOptions = {}): Required<TaskFactoryOptions> {
  return createTask({
    priority: 'CRITICAL',
    estimatedEffort: 8,
    ...options,
  });
}

// ============================================================================
// AGENT FACTORIES
// ============================================================================

export interface AgentFactoryOptions {
  id?: string;
  handle?: string;
  name?: string;
  role?: AgentRole;
  capabilities?: string[];
  status?: AgentStatus;
  currentLoad?: number;
  maxLoad?: number;
  trustLevel?: number;
  costPerHour?: number;
  performanceStats?: {
    successRate: number;
    averageTaskDuration: number;
    tasksCompleted: number;
  };
}

export function createAgent(options: AgentFactoryOptions = {}): Required<AgentFactoryOptions> {
  return {
    id: options.id ?? `agent_${Math.random().toString(36).substr(2, 9)}`,
    handle: options.handle ?? 'test-agent',
    name: options.name ?? 'Test Agent',
    role: options.role ?? 'FULLSTACK_DEV',
    capabilities: options.capabilities ?? ['git', 'docker', 'typescript'],
    status: options.status ?? 'ONLINE',
    currentLoad: options.currentLoad ?? 0,
    maxLoad: options.maxLoad ?? 5,
    trustLevel: options.trustLevel ?? 0.8,
    costPerHour: options.costPerHour ?? 100,
    performanceStats: options.performanceStats ?? {
      successRate: 0.9,
      averageTaskDuration: 120,
      tasksCompleted: 25,
    },
  };
}

export function createCoordinator(options: AgentFactoryOptions = {}): Required<AgentFactoryOptions> {
  return createAgent({
    role: 'COORDINATOR',
    capabilities: ['management', 'planning', 'coordination'],
    ...options,
  });
}

export function createOfflineAgent(options: AgentFactoryOptions = {}): Required<AgentFactoryOptions> {
  return createAgent({
    status: 'OFFLINE',
    ...options,
  });
}

export function createBusyAgent(options: AgentFactoryOptions = {}): Required<AgentFactoryOptions> {
  return createAgent({
    currentLoad: 5,
    maxLoad: 5,
    status: 'BUSY',
    ...options,
  });
}

// ============================================================================
// PROJECT FACTORIES
// ============================================================================

export interface ProjectFactoryOptions {
  id?: string;
  name?: string;
  description?: string;
  state?: ProjectState;
  portfolioId?: string;
  charter?: string;
}

export function createProject(options: ProjectFactoryOptions = {}): Required<ProjectFactoryOptions> {
  return {
    id: options.id ?? `proj_${Math.random().toString(36).substr(2, 9)}`,
    name: options.name ?? 'Test Project',
    description: options.description ?? 'A test project',
    state: options.state ?? 'PLANNING',
    portfolioId: options.portfolioId ?? `portfolio_${Math.random().toString(36).substr(2, 9)}`,
    charter: options.charter ?? 'Test project charter',
  };
}

// ============================================================================
// DEPENDENCY NODE FACTORIES
// ============================================================================

export interface DependencyNodeFactoryOptions {
  id?: string;
  status?: string;
  dependencies?: string[];
  dependents?: string[];
}

export function createDependencyNode(
  options: DependencyNodeFactoryOptions = {}
): Required<DependencyNodeFactoryOptions> {
  return {
    id: options.id ?? `node_${Math.random().toString(36).substr(2, 9)}`,
    status: options.status ?? 'QUEUED',
    dependencies: options.dependencies ?? [],
    dependents: options.dependents ?? [],
  };
}

export function createCompletedNode(
  options: DependencyNodeFactoryOptions = {}
): Required<DependencyNodeFactoryOptions> {
  return createDependencyNode({
    status: 'COMPLETE',
    ...options,
  });
}

// ============================================================================
// STATE MACHINE CONTEXT FACTORIES
// ============================================================================

import type { TaskStateContext } from '../../src/core/state-machines/task.machine';

export interface TaskStateContextFactoryOptions {
  taskId?: string;
  assigneeId?: string;
  dependencies?: string[];
  unmetDependencies?: string[];
  outputs?: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
  agentStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  blocker?: {
    type: string;
    reason: string;
  };
}

export function createTaskStateContext(
  options: TaskStateContextFactoryOptions = {}
): TaskStateContext {
  return {
    taskId: options.taskId ?? `task_${Math.random().toString(36).substr(2, 9)}`,
    assigneeId: options.assigneeId,
    dependencies: options.dependencies ?? [],
    unmetDependencies: options.unmetDependencies ?? [],
    outputs: options.outputs,
    retryCount: options.retryCount ?? 0,
    maxRetries: options.maxRetries ?? 3,
    agentStatus: options.agentStatus ?? 'ONLINE',
    blocker: options.blocker,
  };
}

// ============================================================================
// EVENT FACTORIES
// ============================================================================

import type { TaskEvent } from '../../src/core/state-machines/task.machine';

export function createDependenciesMetEvent(): TaskEvent {
  return { type: 'DEPENDENCIES_MET' };
}

export function createAssignedEvent(assigneeId: string): TaskEvent {
  return { type: 'ASSIGNED', assigneeId };
}

export function createStartedEvent(): TaskEvent {
  return { type: 'STARTED' };
}

export function createCompletedEvent(outputs?: Record<string, unknown>): TaskEvent {
  return { type: 'COMPLETED', outputs };
}

export function createFailedEvent(reason: string): TaskEvent {
  return { type: 'FAILED', reason };
}

export function createBlockedEvent(blockerType: string, reason: string): TaskEvent {
  return { type: 'BLOCKED', blockerType, reason };
}

export function createUnblockedEvent(resolution: string): TaskEvent {
  return { type: 'UNBLOCKED', resolution };
}

export function createCancelEvent(reason: string): TaskEvent {
  return { type: 'CANCEL', reason };
}

// ============================================================================
// BATCH OPERATION FACTORIES
// ============================================================================

export function createTaskBatch(count: number, options: TaskFactoryOptions = {}): ReturnType<typeof createTask>[] {
  return Array.from({ length: count }, (_, i) =>
    createTask({
      id: `task_${i}`,
      title: `Task ${i}`,
      ...options,
    })
  );
}

export function createAgentPool(count: number, options: AgentFactoryOptions = {}): ReturnType<typeof createAgent>[] {
  return Array.from({ length: count }, (_, i) =>
    createAgent({
      id: `agent_${i}`,
      handle: `agent-${i}`,
      ...options,
    })
  );
}
