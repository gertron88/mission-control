/**
 * Service Factory
 * 
 * Central factory for creating service instances with proper dependencies.
 * Ensures consistent initialization and dependency injection.
 */

import type { PrismaClient } from '@prisma/client';

// Lazily import services to avoid circular dependencies
let TaskServiceClass: typeof import('./task.service').TaskService | null = null;
let ProjectServiceClass: typeof import('./project.service').ProjectService | null = null;
let AgentServiceClass: typeof import('./agent.service').AgentService | null = null;
let DependencyServiceClass: typeof import('./dependency.service').DependencyService | null = null;
let DispatchServiceClass: typeof import('./dispatch.service').DispatchService | null = null;
let EscalationServiceClass: typeof import('./escalation.service').EscalationService | null = null;
let NotificationServiceClass: typeof import('./notification.service').NotificationService | null = null;

// ============================================================================
// TYPES
// ============================================================================

export interface Services {
  task: InstanceType<typeof import('./task.service').TaskService>;
  project: InstanceType<typeof import('./project.service').ProjectService>;
  agent: InstanceType<typeof import('./agent.service').AgentService>;
  dependency: InstanceType<typeof import('./dependency.service').DependencyService>;
  dispatch: InstanceType<typeof import('./dispatch.service').DispatchService>;
  escalation: InstanceType<typeof import('./escalation.service').EscalationService>;
  notification: InstanceType<typeof import('./notification.service').NotificationService>;
}

// ============================================================================
// FACTORY
// ============================================================================

let servicesInstance: Services | null = null;

async function loadServices() {
  if (!TaskServiceClass) {
    const [{ TaskService }, { ProjectService }, { AgentService }, { DependencyService }, { DispatchService }, { EscalationService }, { NotificationService }] = await Promise.all([
      import('./task.service'),
      import('./project.service'),
      import('./agent.service'),
      import('./dependency.service'),
      import('./dispatch.service'),
      import('./escalation.service'),
      import('./notification.service'),
    ]);
    TaskServiceClass = TaskService;
    ProjectServiceClass = ProjectService;
    AgentServiceClass = AgentService;
    DependencyServiceClass = DependencyService;
    DispatchServiceClass = DispatchService;
    EscalationServiceClass = EscalationService;
    NotificationServiceClass = NotificationService;
  }
}

/**
 * Create all services with shared dependencies
 */
export async function createServices(prisma: PrismaClient): Promise<Services> {
  // Use singleton pattern for services
  if (servicesInstance) {
    return servicesInstance;
  }

  await loadServices();

  const task = new TaskServiceClass!({ prisma });
  const project = new ProjectServiceClass!({ prisma });
  const agent = new AgentServiceClass!({ prisma });
  const dependency = new DependencyServiceClass!({ prisma });
  const dispatch = new DispatchServiceClass!({ prisma });
  const escalation = new EscalationServiceClass!({ prisma });
  const notification = new NotificationServiceClass!({ prisma });

  servicesInstance = {
    task,
    project,
    agent,
    dependency,
    dispatch,
    escalation,
    notification
  };

  return servicesInstance;
}

/**
 * Get existing services instance
 * Throws if services haven't been initialized
 */
export function getServices(): Services {
  if (!servicesInstance) {
    throw new Error('Services not initialized. Call createServices(prisma) first.');
  }
  return servicesInstance;
}

/**
 * Reset services (useful for testing)
 */
export function resetServices(): void {
  servicesInstance = null;
}
