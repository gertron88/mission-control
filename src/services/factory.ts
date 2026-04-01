/**
 * Service Factory
 * 
 * Central factory for creating service instances with proper dependencies.
 * Ensures consistent initialization and dependency injection.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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
let isInitializing = false;

/**
 * Create all services with shared dependencies
 */
export function createServices(prismaClient: PrismaClient): Services {
  // Use singleton pattern for services
  if (servicesInstance) {
    return servicesInstance;
  }

  // Prevent re-entrant initialization
  if (isInitializing) {
    throw new Error('Services are currently being initialized. Avoid circular dependencies.');
  }

  isInitializing = true;

  try {
    const task = new TaskService({ prisma: prismaClient });
    const project = new ProjectService({ prisma: prismaClient });
    const agent = new AgentService({ prisma: prismaClient });
    const dependency = new DependencyService({ prisma: prismaClient });
    const dispatch = new DispatchService({ prisma: prismaClient });
    const escalation = new EscalationService({ prisma: prismaClient });
    const notification = new NotificationService({ prisma: prismaClient });

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
  } finally {
    isInitializing = false;
  }
}

/**
 * Get existing services instance
 * Lazy-initializes if not already created
 */
export function getServices(): Services {
  if (!servicesInstance) {
    // Auto-initialize with the global prisma instance
    createServices(prisma);
  }
  return servicesInstance!;
}

/**
 * Reset services (useful for testing)
 */
export function resetServices(): void {
  servicesInstance = null;
}
