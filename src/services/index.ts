/**
 * Service Layer Index
 * 
 * All business logic services are exported from here.
 * Services handle domain operations and coordinate between
 * the API layer and the infrastructure/core layers.
 */

// Task Service
export {
  TaskService,
  type TaskServiceDependencies,
  type CreateTaskInput,
  type UpdateTaskInput,
  type AssignTaskInput,
  type BlockTaskInput,
  type UnblockTaskInput,
} from './task.service';

// Project Service
export {
  ProjectService,
  type ProjectServiceDependencies,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectMetrics,
} from './project.service';

// Agent Service
export {
  AgentService,
  type AgentServiceDependencies,
  type RecordHeartbeatInput,
  type AgentMetrics,
} from './agent.service';

// Dependency Service
export {
  DependencyService,
  type DependencyServiceDependencies,
  type DependencyGraphResult,
  type ResolveDependenciesInput,
} from './dependency.service';

// Dispatch Service
export {
  DispatchService,
  type DispatchServiceDependencies,
  type DispatchResult,
  type BatchDispatchResult,
} from './dispatch.service';

// Service Factory
export { createServices, type Services } from './factory';
