/**
 * Service Factory
 * 
 * Central factory for creating service instances with proper dependencies.
 * Ensures consistent initialization and dependency injection.
 */

import { PrismaClient } from '@prisma/client';
import { TaskService } from './task.service';
import { ProjectService } from './project.service';
import { AgentService } from './agent.service';
import { DependencyService } from './dependency.service';
import { DispatchService } from './dispatch.service';
import { EscalationService } from './escalation.service';
import { NotificationService } from './notification.service';

// ============================================================================
// TYPES
// ============================================================================

export interface Services {
  task: TaskService;
  project: ProjectService;
  agent: AgentService;
  dependency: DependencyService;
  dispatch: DispatchService;
  escalation: EscalationService;
  notification: NotificationService;
}

// ============================================================================
// FACTORY
// ============================================================================

let servicesInstance: Services | null = null;

/**
 * Create all services with shared dependencies
 */
export function createServices(prisma: PrismaClient): Services {
  // Use singleton pattern for services
  if (servicesInstance) {
    return servicesInstance;
  }

  const task = new TaskService({ prisma });
  const project = new ProjectService({ prisma });
  const agent = new AgentService({ prisma });
  const dependency = new DependencyService({ prisma });
  const dispatch = new DispatchService({ prisma });
  const escalation = new EscalationService({ prisma });
  const notification = new NotificationService({ prisma });

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
