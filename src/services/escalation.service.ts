/**
 * Escalation Service
 * 
 * Handles automatic escalation detection and management.
 * Tracks when tasks/projects exceed thresholds and need human intervention.
 */

import { PrismaClient, TaskStatus, AuditSeverity, ActorType } from '@prisma/client';
import { Result } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface EscalationServiceDependencies {
  prisma: PrismaClient;
}

export interface EscalationCheck {
  type: 'RETRY_EXHAUSTED' | 'BUDGET_OVERRUN' | 'DEADLINE_SLIPPAGE' | 
        'SECURITY_VIOLATION' | 'POLICY_VIOLATION' | 'CONFLICTING_REQUIREMENTS' |
        'HIGH_RISK_ACTION' | 'PRODUCTION_DEPLOY_REQUEST';
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  resourceType: 'TASK' | 'PROJECT' | 'AGENT';
  resourceId: string;
  projectId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface EscalationRule {
  id: string;
  name: string;
  condition: (context: EscalationContext) => boolean;
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  autoAction?: 'FREEZE' | 'NOTIFY' | 'ROLLBACK';
}

export interface EscalationContext {
  task?: {
    id: string;
    status: TaskStatus;
    retryCount: number;
    maxRetries: number;
    dueDate?: Date;
    startedAt?: Date;
  };
  project?: {
    id: string;
    budgetAllocated?: number;
    budgetSpent: number;
    plannedEnd?: Date;
  };
  agent?: {
    id: string;
    tasksFailed: number;
  };
}

// ============================================================================
// ESCALATION RULES
// ============================================================================

const DEFAULT_RULES: EscalationRule[] = [
  {
    id: 'retry_exhausted',
    name: 'Task Retry Exhausted',
    condition: (ctx) => 
      ctx.task !== undefined && 
      ctx.task.retryCount >= ctx.task.maxRetries,
    severity: 'URGENT',
    autoAction: 'NOTIFY'
  },
  {
    id: 'budget_overrun_90',
    name: 'Budget 90% Consumed',
    condition: (ctx) => 
      ctx.project !== undefined &&
      ctx.project.budgetAllocated !== undefined &&
      (ctx.project.budgetSpent / ctx.project.budgetAllocated) > 0.9,
    severity: 'WARNING',
    autoAction: 'NOTIFY'
  },
  {
    id: 'budget_overrun_100',
    name: 'Budget Exceeded',
    condition: (ctx) => 
      ctx.project !== undefined &&
      ctx.project.budgetAllocated !== undefined &&
      ctx.project.budgetSpent > ctx.project.budgetAllocated,
    severity: 'CRITICAL',
    autoAction: 'FREEZE'
  },
  {
    id: 'deadline_slippage_50',
    name: 'Deadline 50% Overdue',
    condition: (ctx) => {
      if (!ctx.task?.startedAt || !ctx.task?.dueDate) return false;
      const expected = ctx.task.dueDate.getTime() - ctx.task.startedAt.getTime();
      const actual = Date.now() - ctx.task.startedAt.getTime();
      return actual > expected * 1.5;
    },
    severity: 'WARNING',
    autoAction: 'NOTIFY'
  },
  {
    id: 'deadline_slippage_100',
    name: 'Deadline 100% Overdue',
    condition: (ctx) => {
      if (!ctx.task?.startedAt || !ctx.task?.dueDate) return false;
      const expected = ctx.task.dueDate.getTime() - ctx.task.startedAt.getTime();
      const actual = Date.now() - ctx.task.startedAt.getTime();
      return actual > expected * 2;
    },
    severity: 'URGENT',
    autoAction: 'NOTIFY'
  },
  {
    id: 'agent_failure_spike',
    name: 'Agent Failure Spike',
    condition: (ctx) => 
      ctx.agent !== undefined && 
      ctx.agent.tasksFailed > 5,
    severity: 'CRITICAL',
    autoAction: 'FREEZE'
  }
];

// ============================================================================
// SERVICE
// ============================================================================

export class EscalationService {
  private rules: EscalationRule[];

  constructor(
    private deps: EscalationServiceDependencies,
    rules: EscalationRule[] = DEFAULT_RULES
  ) {
    this.rules = rules;
  }

  /**
   * Check a task for escalation triggers
   */
  async checkTask(taskId: string): Promise<Result<EscalationCheck[], Error>> {
    try {
      const task = await this.deps.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true }
      });

      if (!task) {
        return Result.err(new Error('Task not found'));
      }

      const escalations: EscalationCheck[] = [];
      const context: EscalationContext = {
        task: {
          id: task.id,
          status: task.status,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          dueDate: task.dueDate || undefined,
          startedAt: task.startedAt || undefined
        }
      };

      // Evaluate rules
      for (const rule of this.rules) {
        if (rule.condition(context)) {
          escalations.push({
            type: rule.id as EscalationCheck['type'],
            severity: rule.severity,
            resourceType: 'TASK',
            resourceId: taskId,
            projectId: task.projectId,
            message: `Escalation: ${rule.name}`,
            metadata: { ruleId: rule.id, autoAction: rule.autoAction }
          });

          // Execute auto-action if configured
          if (rule.autoAction) {
            await this.executeAutoAction(rule.autoAction, 'TASK', taskId, task.projectId);
          }
        }
      }

      // Create audit entries for escalations
      for (const escalation of escalations) {
        await this.createEscalationRecord(escalation);
      }

      return Result.ok(escalations);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check a project for escalation triggers
   */
  async checkProject(projectId: string): Promise<Result<EscalationCheck[], Error>> {
    try {
      const project = await this.deps.prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return Result.err(new Error('Project not found'));
      }

      const escalations: EscalationCheck[] = [];
      const context: EscalationContext = {
        project: {
          id: project.id,
          budgetAllocated: project.budgetAllocated ? Number(project.budgetAllocated) : undefined,
          budgetSpent: Number(project.budgetSpent),
          plannedEnd: project.plannedEnd || undefined
        }
      };

      // Evaluate rules
      for (const rule of this.rules) {
        if (rule.condition(context)) {
          escalations.push({
            type: rule.id as EscalationCheck['type'],
            severity: rule.severity,
            resourceType: 'PROJECT',
            resourceId: projectId,
            projectId: projectId,
            message: `Escalation: ${rule.name}`,
            metadata: { ruleId: rule.id, autoAction: rule.autoAction }
          });

          if (rule.autoAction) {
            await this.executeAutoAction(rule.autoAction, 'PROJECT', projectId, projectId);
          }
        }
      }

      for (const escalation of escalations) {
        await this.createEscalationRecord(escalation);
      }

      return Result.ok(escalations);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all active escalations
   */
  async getActiveEscalations(): Promise<Result<EscalationCheck[], Error>> {
    try {
      // Get recent audit logs that are escalations
      const logs = await this.deps.prisma.auditLog.findMany({
        where: {
          action: { startsWith: 'ESCALATION' },
          severity: { in: ['WARNING', 'ERROR', 'CRITICAL', 'SECURITY'] },
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      const escalations: EscalationCheck[] = logs.map(log => ({
        type: log.action.replace('ESCALATION_', '') as EscalationCheck['type'],
        severity: log.severity === 'CRITICAL' ? 'CRITICAL' : 
                  log.severity === 'ERROR' ? 'URGENT' : 'WARNING',
        resourceType: log.resourceType as 'TASK' | 'PROJECT' | 'AGENT',
        resourceId: log.resourceId || '',
        projectId: log.resourceId || '',
        message: log.action,
        metadata: log.afterState
      }));

      return Result.ok(escalations);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute automatic action for an escalation
   */
  private async executeAutoAction(
    action: 'FREEZE' | 'NOTIFY' | 'ROLLBACK',
    resourceType: 'TASK' | 'PROJECT' | 'AGENT',
    resourceId: string,
    projectId: string
  ): Promise<void> {
    switch (action) {
      case 'FREEZE':
        if (resourceType === 'PROJECT') {
          await this.deps.prisma.project.update({
            where: { id: resourceId },
            data: { state: 'BLOCKED' }
          });
        } else if (resourceType === 'TASK') {
          await this.deps.prisma.task.update({
            where: { id: resourceId },
            data: { status: 'BLOCKED', blockerType: 'RISK_THRESHOLD_EXCEEDED' }
          });
        }
        break;
        
      case 'NOTIFY':
        // Broadcast notification event
        broadcastEvent({
          type: 'ESCALATION_TRIGGERED',
          projectId,
          data: { resourceType, resourceId, action }
        });
        break;
        
      case 'ROLLBACK':
        // This would trigger rollback workflow
        broadcastEvent({
          type: 'ROLLBACK_REQUESTED',
          projectId,
          data: { resourceType, resourceId }
        });
        break;
    }
  }

  /**
   * Create audit record for escalation
   */
  private async createEscalationRecord(escalation: EscalationCheck): Promise<void> {
    await logAction({
      actorType: ActorType.SYSTEM,
      actorId: 'escalation-service',
      actorName: 'Escalation Service',
      action: `ESCALATION_${escalation.type}`,
      resourceType: escalation.resourceType,
      resourceId: escalation.resourceId,
      severity: this.mapSeverityToAudit(escalation.severity),
      afterState: escalation.metadata
    });
  }

  private mapSeverityToAudit(severity: EscalationCheck['severity']): AuditSeverity {
    switch (severity) {
      case 'INFO': return AuditSeverity.INFO;
      case 'WARNING': return AuditSeverity.WARNING;
      case 'URGENT': return AuditSeverity.ERROR;
      case 'CRITICAL': return AuditSeverity.CRITICAL;
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createEscalationService(
  deps: EscalationServiceDependencies,
  customRules?: EscalationRule[]
): EscalationService {
  return new EscalationService(deps, customRules);
}
