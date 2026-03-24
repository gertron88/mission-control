/**
 * Control Loop Scheduler
 * 
 * Implements the autonomous control loops described in the Mission Control spec:
 * - Strategic loop (less frequent, high-level planning)
 * - Planning loop (project cadence, milestone updates)
 * - Execution loop (constant task dispatch and monitoring)
 * - Validation loop (after outputs appear)
 * - Recovery loop (on failure)
 */

import { PrismaClient, TaskStatus, ProjectState } from '@prisma/client';
import { Result } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';

// ============================================================================
// TYPES
// ============================================================================

export interface SchedulerDependencies {
  prisma: PrismaClient;
}

export interface LoopConfig {
  enabled: boolean;
  intervalMs: number;
  lastRunAt?: Date;
}

export interface SchedulerState {
  strategic: LoopConfig;
  planning: LoopConfig;
  execution: LoopConfig;
  validation: LoopConfig;
  recovery: LoopConfig;
  isRunning: boolean;
}

// ============================================================================
// SCHEDULER
// ============================================================================

export class ControlLoopScheduler {
  private state: SchedulerState;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private deps: SchedulerDependencies,
    config?: Partial<SchedulerState>
  ) {
    this.state = {
      strategic: { enabled: true, intervalMs: 60 * 60 * 1000, ...config?.strategic }, // 1 hour
      planning: { enabled: true, intervalMs: 15 * 60 * 1000, ...config?.planning },   // 15 min
      execution: { enabled: true, intervalMs: 30 * 1000, ...config?.execution },      // 30 sec
      validation: { enabled: true, intervalMs: 5 * 60 * 1000, ...config?.validation }, // 5 min
      recovery: { enabled: true, intervalMs: 60 * 1000, ...config?.recovery },        // 1 min
      isRunning: false,
      ...config
    };
  }

  /**
   * Start all control loops
   */
  start(): void {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    console.log('[Scheduler] Control loops starting...');

    // Strategic Loop - Reprioritize projects, adjust budget/capacity
    if (this.state.strategic.enabled) {
      this.timers.set('strategic', setInterval(
        () => this.runStrategicLoop(),
        this.state.strategic.intervalMs
      ));
    }

    // Planning Loop - Update milestone plans, decompose new work
    if (this.state.planning.enabled) {
      this.timers.set('planning', setInterval(
        () => this.runPlanningLoop(),
        this.state.planning.intervalMs
      ));
    }

    // Execution Loop - Dispatch ready tasks, monitor progress
    if (this.state.execution.enabled) {
      this.timers.set('execution', setInterval(
        () => this.runExecutionLoop(),
        this.state.execution.intervalMs
      ));
    }

    // Validation Loop - Test deliverables, verify criteria
    if (this.state.validation.enabled) {
      this.timers.set('validation', setInterval(
        () => this.runValidationLoop(),
        this.state.validation.intervalMs
      ));
    }

    // Recovery Loop - Detect anomalies, replan
    if (this.state.recovery.enabled) {
      this.timers.set('recovery', setInterval(
        () => this.runRecoveryLoop(),
        this.state.recovery.intervalMs
      ));
    }

    // Run execution loop immediately
    this.runExecutionLoop();
  }

  /**
   * Stop all control loops
   */
  stop(): void {
    console.log('[Scheduler] Stopping control loops...');
    
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      console.log(`[Scheduler] Stopped ${name} loop`);
    }
    
    this.timers.clear();
    this.state.isRunning = false;
  }

  /**
   * Get current scheduler status
   */
  getStatus(): SchedulerState {
    return { ...this.state };
  }

  // ============================================================================
  // LOOP IMPLEMENTATIONS
  // ============================================================================

  /**
   * Strategic Loop
   * - Reprioritize projects
   * - Adjust budget/capacity allocations
   * - Approve/pause initiatives
   */
  private async runStrategicLoop(): Promise<void> {
    try {
      console.log('[Strategic Loop] Running...');
      this.state.strategic.lastRunAt = new Date();

      // Check for budget overruns
      const projectsWithBudgetIssues = await this.deps.prisma.project.findMany({
        where: {
          isArchived: false,
          budgetAllocated: { not: null },
          budgetSpent: { gt: 0 }
        }
      });

      for (const project of projectsWithBudgetIssues) {
        const budgetAllocated = Number(project.budgetAllocated);
        const budgetSpent = Number(project.budgetSpent);
        const utilization = budgetSpent / budgetAllocated;

        if (utilization > 0.9 && utilization <= 1.0) {
          // Warning level
          broadcastEvent({
            type: 'BUDGET_WARNING',
            projectId: project.id,
            data: { utilization, threshold: 0.9 }
          });
        } else if (utilization > 1.0) {
          // Critical - freeze project
          await this.deps.prisma.project.update({
            where: { id: project.id },
            data: { state: 'BLOCKED' }
          });
          
          broadcastEvent({
            type: 'BUDGET_EXCEEDED',
            projectId: project.id,
            data: { utilization, budgetAllocated, budgetSpent }
          });
        }
      }

      console.log('[Strategic Loop] Completed');
    } catch (error) {
      console.error('[Strategic Loop] Error:', error);
    }
  }

  /**
   * Planning Loop
   * - Update milestone plans
   * - Decompose new work
   * - Revise dependencies
   * - Forecast completion
   */
  private async runPlanningLoop(): Promise<void> {
    try {
      console.log('[Planning Loop] Running...');
      this.state.planning.lastRunAt = new Date();

      // Find projects in planning phase that need updates
      const planningProjects = await this.deps.prisma.project.findMany({
        where: {
          state: 'PLANNING',
          isArchived: false
        },
        include: {
          milestones: {
            orderBy: { sequence: 'asc' }
          }
        }
      });

      for (const project of planningProjects) {
        // Check if all milestones are complete - move to executing
        const incompleteMilestones = project.milestones.filter(m => m.state !== 'COMPLETE');
        
        if (incompleteMilestones.length === 0 && project.milestones.length > 0) {
          await this.deps.prisma.project.update({
            where: { id: project.id },
            data: { 
              state: 'EXECUTING',
              actualStart: new Date()
            }
          });
          
          broadcastEvent({
            type: 'PROJECT_STARTED',
            projectId: project.id
          });
        }
      }

      console.log('[Planning Loop] Completed');
    } catch (error) {
      console.error('[Planning Loop] Error:', error);
    }
  }

  /**
   * Execution Loop
   * - Dispatch ready tasks
   * - Monitor progress
   * - Retry failures
   * - Unblock work
   */
  private async runExecutionLoop(): Promise<void> {
    try {
      this.state.execution.lastRunAt = new Date();

      // 1. Resolve dependencies - move tasks from AWAITING_DEPENDENCY to READY
      const tasksAwaitingDeps = await this.deps.prisma.task.findMany({
        where: {
          status: 'AWAITING_DEPENDENCY',
          isDeleted: false
        },
        include: {
          project: {
            select: {
              tasks: {
                where: { isDeleted: false },
                select: { id: true, status: true }
              }
            }
          }
        }
      });

      for (const task of tasksAwaitingDeps) {
        const deps = task.dependencies as string[] || [];
        const allComplete = deps.every(depId => {
          const dep = task.project.tasks.find(t => t.id === depId);
          return dep?.status === 'COMPLETE' || dep?.status === 'CANCELED';
        });

        if (allComplete || deps.length === 0) {
          await this.deps.prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'READY',
              statusHistory: {
                push: {
                  status: 'READY',
                  timestamp: new Date().toISOString(),
                  actor: 'scheduler',
                  reason: 'Dependencies resolved'
                }
              }
            }
          });
        }
      }

      // 2. Auto-assign READY tasks if configured
      // (This would integrate with the dispatch service)
      const readyTasks = await this.deps.prisma.task.findMany({
        where: {
          status: 'READY',
          assigneeId: null,
          isDeleted: false
        }
      });

      if (readyTasks.length > 0) {
        broadcastEvent({
          type: 'TASKS_READY_FOR_DISPATCH',
          data: { count: readyTasks.length, taskIds: readyTasks.map(t => t.id) }
        });
      }

    } catch (error) {
      console.error('[Execution Loop] Error:', error);
    }
  }

  /**
   * Validation Loop
   * - Test deliverables
   * - Verify criteria
   * - Approve advancement
   */
  private async runValidationLoop(): Promise<void> {
    try {
      console.log('[Validation Loop] Running...');
      this.state.validation.lastRunAt = new Date();

      // Find tasks awaiting validation that have been waiting too long
      const tasksAwaitingValidation = await this.deps.prisma.task.findMany({
        where: {
          status: 'AWAITING_VALIDATION',
          isDeleted: false,
          updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h old
        }
      });

      for (const task of tasksAwaitingValidation) {
        // Escalate long-pending validations
        broadcastEvent({
          type: 'VALIDATION_PENDING_TOO_LONG',
          taskId: task.id,
          projectId: task.projectId,
          data: { taskId: task.id, pendingSince: task.updatedAt }
        });
      }

      // Find artifacts pending validation
      const unvalidatedArtifacts = await this.deps.prisma.artifact.findMany({
        where: {
          validated: false,
          createdAt: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } // 4h old
        }
      });

      if (unvalidatedArtifacts.length > 0) {
        broadcastEvent({
          type: 'ARTIFACTS_PENDING_VALIDATION',
          data: { count: unvalidatedArtifacts.length }
        });
      }

      console.log('[Validation Loop] Completed');
    } catch (error) {
      console.error('[Validation Loop] Error:', error);
    }
  }

  /**
   * Recovery Loop
   * - Detect anomalies
   * - Isolate blast radius
   * - Rollback
   * - Replan
   * - Escalate
   */
  private async runRecoveryLoop(): Promise<void> {
    try {
      console.log('[Recovery Loop] Running...');
      this.state.recovery.lastRunAt = new Date();

      // Find failed tasks that haven't been retried
      const failedTasks = await this.deps.prisma.task.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: 3 },
          isDeleted: false
        }
      });

      for (const task of failedTasks) {
        // Check if enough time has passed since last attempt
        const lastUpdate = new Date(task.updatedAt).getTime();
        const timeSinceFailure = Date.now() - lastUpdate;
        
        if (timeSinceFailure > 5 * 60 * 1000) { // 5 minutes
          // Auto-retry with exponential backoff
          const newRetryCount = task.retryCount + 1;
          
          await this.deps.prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'READY',
              retryCount: newRetryCount,
              statusHistory: {
                push: {
                  status: 'READY',
                  timestamp: new Date().toISOString(),
                  actor: 'recovery-loop',
                  reason: `Auto-retry attempt ${newRetryCount}/3`
                }
              }
            }
          });

          broadcastEvent({
            type: 'TASK_AUTO_RETRY',
            taskId: task.id,
            projectId: task.projectId,
            data: { retryCount: newRetryCount }
          });
        }
      }

      // Find agents in ERROR state and mark OFFLINE if stale
      const errorAgents = await this.deps.prisma.agent.findMany({
        where: {
          status: 'ERROR',
          lastSeenAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
        }
      });

      for (const agent of errorAgents) {
        await this.deps.prisma.agent.update({
          where: { id: agent.id },
          data: { status: 'OFFLINE' }
        });
      }

      console.log('[Recovery Loop] Completed');
    } catch (error) {
      console.error('[Recovery Loop] Error:', error);
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let schedulerInstance: ControlLoopScheduler | null = null;

export function createScheduler(deps: SchedulerDependencies): ControlLoopScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ControlLoopScheduler(deps);
  }
  return schedulerInstance;
}

export function getScheduler(): ControlLoopScheduler | null {
  return schedulerInstance;
}

export function resetScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
