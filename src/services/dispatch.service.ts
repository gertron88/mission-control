/**
 * Dispatch Service
 * 
 * Wraps the agent dispatcher for use by API routes.
 * Provides high-level operations for task assignment.
 */

import { PrismaClient } from '@prisma/client';
import { Result, ValidationError } from '@/types/domain';
import { 
  AgentDispatcher, 
  createDispatcher,
  type Agent,
  type Task,
  type DispatchRecommendation 
} from '@/core/dispatcher/scoring';
import { broadcastEvent } from '@/lib/events';

// ============================================================================
// TYPES
// ============================================================================

export interface DispatchServiceDependencies {
  prisma: PrismaClient;
}

export interface DispatchResult {
  taskId: string;
  recommendedAgentId: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  scores: Array<{
    agentId: string;
    agentHandle: string;
    totalScore: number;
    breakdown: {
      capabilityMatch: number;
      availability: number;
      historicalSuccess: number;
      costEfficiency: number;
      priorityAlignment: number;
      roleMatch: number;
    };
    reasoning: string[];
  }>;
}

export interface BatchDispatchResult {
  assignments: Array<{ taskId: string; agentId: string }>;
  unassigned: string[];
  stats: {
    total: number;
    assigned: number;
    skipped: number;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export class DispatchService {
  private dispatcher: AgentDispatcher;

  constructor(private deps: DispatchServiceDependencies) {
    this.dispatcher = createDispatcher();
  }

  /**
   * Find the best agent for a specific task
   */
  async recommendAgent(taskId: string): Promise<Result<DispatchResult, Error>> {
    try {
      // Get task details
      const task = await this.deps.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: { select: { id: true, name: true } } },
      });

      if (!task) {
        return Result.err(new Error('Task not found'));
      }

      // Get available agents
      const agents = await this.deps.prisma.agent.findMany({
        where: { isActive: true },
      });

      // Map to domain types
      const domainTask: Task = {
        id: task.id,
        title: task.title,
        type: task.type,
        priority: task.priority as Task['priority'],
        requiredRole: undefined, // Could be derived from task type
        requiredTools: task.requiredTools as string[] || [],
        estimatedEffort: task.estimatedEffort || 1,
        projectPriority: 50, // Default
      };

      const domainAgents: Agent[] = agents.map(a => ({
        id: a.id,
        handle: a.handle,
        role: a.role,
        capabilities: a.capabilities as string[] || [],
        status: a.status as Agent['status'],
        currentLoad: a.currentLoad || 0,
        maxLoad: a.maxLoad || 5,
        trustLevel: a.trustLevel || 0.5,
        costPerHour: undefined,
        performanceStats: a.performanceStats as any,
      }));

      const recommendation = this.dispatcher.recommendAgent(domainTask, domainAgents);

      // Map to result type
      const result: DispatchResult = {
        taskId,
        recommendedAgentId: recommendation.recommendedAgentId,
        confidence: recommendation.confidence,
        reason: recommendation.reason,
        scores: recommendation.scores.map(s => {
          const agent = agents.find(a => a.id === s.agentId);
          return {
            agentId: s.agentId,
            agentHandle: agent?.handle || 'Unknown',
            totalScore: s.totalScore,
            breakdown: s.breakdown,
            reasoning: s.reasoning,
          };
        }),
      };

      return Result.ok(result);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Auto-assign a task to the best available agent
   */
  async autoAssign(taskId: string, actorId: string): Promise<Result<any, Error>> {
    try {
      const recommendation = await this.recommendAgent(taskId);
      
      if (!recommendation.ok) {
        return Result.err(recommendation.error);
      }

      const { recommendedAgentId, confidence } = recommendation.value;

      if (!recommendedAgentId) {
        return Result.err(new Error('No suitable agent found'));
      }

      if (confidence === 'LOW') {
        return Result.err(new Error('Confidence too low for auto-assignment'));
      }

      // Update task with assignment
      const updatedTask = await this.deps.prisma.task.update({
        where: { id: taskId },
        data: {
          assigneeId: recommendedAgentId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
          statusHistory: {
            push: {
              status: 'ASSIGNED',
              timestamp: new Date().toISOString(),
              actor: 'system',
              reason: 'Auto-assigned by dispatch service',
            },
          },
        },
        include: {
          assignee: { select: { id: true, handle: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      broadcastEvent({
        type: 'TASK_ASSIGNED',
        taskId,
        data: {
          agentId: recommendedAgentId,
          autoAssigned: true,
          confidence,
        },
      });

      return Result.ok(updatedTask);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Run batch dispatch for all ready tasks
   */
  async batchDispatch(actorId: string): Promise<Result<BatchDispatchResult, Error>> {
    try {
      // Get all ready tasks
      const tasks = await this.deps.prisma.task.findMany({
        where: {
          status: 'READY',
          assigneeId: null,
          isDeleted: false,
        },
        include: { project: { select: { id: true, name: true } } },
      });

      // Get available agents
      const agents = await this.deps.prisma.agent.findMany({
        where: { isActive: true, status: 'ONLINE' },
      });

      if (tasks.length === 0) {
        return Result.ok({
          assignments: [],
          unassigned: [],
          stats: { total: 0, assigned: 0, skipped: 0 },
        });
      }

      // Map to domain types
      const domainTasks: Task[] = tasks.map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        priority: t.priority as Task['priority'],
        requiredTools: t.requiredTools as string[] || [],
        estimatedEffort: t.estimatedEffort || 1,
        projectPriority: 50,
      }));

      const domainAgents: Agent[] = agents.map(a => ({
        id: a.id,
        handle: a.handle,
        role: a.role,
        capabilities: a.capabilities as string[] || [],
        status: a.status as Agent['status'],
        currentLoad: a.currentLoad || 0,
        maxLoad: a.maxLoad || 5,
        trustLevel: a.trustLevel || 0.5,
        performanceStats: a.performanceStats as any,
      }));

      // Run batch dispatch
      const result = this.dispatcher.batchDispatch(domainTasks, domainAgents);

      if (!result.ok) {
        return Result.err(result.error);
      }

      const assignments = result.value;
      const assignedTaskIds: string[] = [];

      // Apply assignments
      for (const [taskId, agentId] of assignments) {
        await this.deps.prisma.task.update({
          where: { id: taskId },
          data: {
            assigneeId: agentId,
            status: 'ASSIGNED',
            assignedAt: new Date(),
            statusHistory: {
              push: {
                status: 'ASSIGNED',
                timestamp: new Date().toISOString(),
                actor: 'dispatch-service',
                reason: 'Batch dispatch assignment',
              },
            },
          },
        });
        assignedTaskIds.push(taskId);

        broadcastEvent({
          type: 'TASK_ASSIGNED',
          taskId,
          data: { agentId, batchAssigned: true },
        });
      }

      const unassigned = tasks
        .filter(t => !assignments.has(t.id))
        .map(t => t.id);

      return Result.ok({
        assignments: Array.from(assignments.entries()).map(([taskId, agentId]) => ({
          taskId,
          agentId,
        })),
        unassigned,
        stats: {
          total: tasks.length,
          assigned: assignments.size,
          skipped: tasks.length - assignments.size,
        },
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a specific agent is eligible for a task
   */
  async checkEligibility(taskId: string, agentId: string): Promise<Result<{
    eligible: boolean;
    score?: number;
    reasons: string[];
  }, Error>> {
    try {
      const [task, agent] = await Promise.all([
        this.deps.prisma.task.findUnique({ where: { id: taskId } }),
        this.deps.prisma.agent.findUnique({ where: { id: agentId } }),
      ]);

      if (!task) {
        return Result.err(new Error('Task not found'));
      }
      if (!agent) {
        return Result.err(new Error('Agent not found'));
      }

      const domainTask: Task = {
        id: task.id,
        title: task.title,
        type: task.type,
        priority: task.priority as Task['priority'],
        requiredTools: task.requiredTools as string[] || [],
        estimatedEffort: task.estimatedEffort || 1,
        projectPriority: 50,
      };

      const domainAgent: Agent = {
        id: agent.id,
        handle: agent.handle,
        role: agent.role,
        capabilities: agent.capabilities as string[] || [],
        status: agent.status as Agent['status'],
        currentLoad: agent.currentLoad || 0,
        maxLoad: agent.maxLoad || 5,
        trustLevel: agent.trustLevel || 0.5,
        performanceStats: agent.performanceStats as any,
      };

      const score = this.dispatcher.calculateScore(domainTask, domainAgent);

      const reasons: string[] = [];
      if (agent.status !== 'ONLINE') reasons.push('Agent is not online');
      if (agent.currentLoad >= (agent.maxLoad || 5)) {
        reasons.push('Agent is at capacity');
      }

      const requiredTools = task.requiredTools as string[] || [];
      const hasTools = requiredTools.every(tool => 
        (agent.capabilities as string[] || []).includes(tool)
      );
      if (!hasTools) reasons.push('Agent lacks required capabilities');

      return Result.ok({
        eligible: score.totalScore > 0.3 && reasons.length === 0,
        score: score.totalScore,
        reasons: reasons.length > 0 ? reasons : score.reasoning,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}