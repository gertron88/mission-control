/**
 * Agent Service
 * 
 * Handles all agent-related business logic including:
 * - Heartbeat recording
 * - Status management
 * - Agent metrics
 */

import { PrismaClient, ActorType } from '@prisma/client';
import { Result } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentServiceDependencies {
  prisma: PrismaClient;
}

export interface RecordHeartbeatInput {
  agentId: string;
  status?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  activeTaskCount?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentMetrics {
  agentId: string;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  successRate: number;
  averageTaskDuration?: number;
  lastSeenAt?: Date;
  currentLoad: number;
  currentStatus: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class AgentService {
  constructor(private deps: AgentServiceDependencies) {}

  /**
   * Record an agent heartbeat
   */
  async recordHeartbeat(input: RecordHeartbeatInput): Promise<Result<any, Error>> {
    try {
      // Update agent status
      await this.deps.prisma.agent.update({
        where: { id: input.agentId },
        data: {
          status: input.status || 'ONLINE',
          lastSeenAt: new Date(),
        },
      });

      // Record heartbeat
      const heartbeat = await this.deps.prisma.agentHeartbeat.create({
        data: {
          agentId: input.agentId,
          cpuUsage: input.cpuUsage,
          memoryUsage: input.memoryUsage,
          activeTaskCount: input.activeTaskCount || 0,
          metadata: input.metadata,
        },
      });

      // Broadcast event
      broadcastEvent({
        type: 'AGENT_HEARTBEAT',
        agentId: input.agentId,
        data: heartbeat,
      });

      return Result.ok(heartbeat);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Result<any, Error>> {
    try {
      const agent = await this.deps.prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          _count: {
            select: {
              assignedTasks: { where: { status: { notIn: ['COMPLETE', 'CANCELED'] } } },
            },
          },
        },
      });

      if (!agent) {
        return Result.err(new Error('Agent not found'));
      }

      return Result.ok(agent);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List all agents
   */
  async listAgents(options?: { status?: string; role?: string }): Promise<Result<any[], Error>> {
    try {
      const agents = await this.deps.prisma.agent.findMany({
        where: {
          ...(options?.status && { status: options.status }),
          ...(options?.role && { role: options.role }),
        },
        include: {
          _count: {
            select: {
              assignedTasks: { where: { status: { notIn: ['COMPLETE', 'CANCELED'] } } },
            },
          },
        },
        orderBy: { lastSeenAt: 'desc' },
      });

      return Result.ok(agents);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(agentId: string): Promise<Result<AgentMetrics, Error>> {
    try {
      const agent = await this.deps.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return Result.err(new Error('Agent not found'));
      }

      // Get completed tasks
      const completedTasks = await this.deps.prisma.task.findMany({
        where: {
          assigneeId: agentId,
          status: 'COMPLETE',
          completedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
      });

      // Get failed tasks
      const failedTasks = await this.deps.prisma.task.findMany({
        where: {
          assigneeId: agentId,
          status: 'FAILED',
        },
      });

      // Get current load
      const currentTasks = await this.deps.prisma.task.count({
        where: {
          assigneeId: agentId,
          status: { in: ['ASSIGNED', 'RUNNING'] },
        },
      });

      // Calculate average duration
      const taskDurations = completedTasks
        .filter(t => t.startedAt && t.completedAt)
        .map(t => {
          const start = new Date(t.startedAt!).getTime();
          const end = new Date(t.completedAt!).getTime();
          return (end - start) / (1000 * 60 * 60); // hours
        });

      const averageTaskDuration = taskDurations.length > 0 
        ? taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length 
        : undefined;

      const totalTasksCompleted = completedTasks.length;
      const totalTasksFailed = failedTasks.length;
      const totalTasks = totalTasksCompleted + totalTasksFailed;
      const successRate = totalTasks > 0 ? totalTasksCompleted / totalTasks : 0;

      const metrics: AgentMetrics = {
        agentId,
        totalTasksCompleted,
        totalTasksFailed,
        successRate: Math.round(successRate * 100) / 100,
        averageTaskDuration: averageTaskDuration 
          ? Math.round(averageTaskDuration * 100) / 100 
          : undefined,
        lastSeenAt: agent.lastSeenAt,
        currentLoad: currentTasks,
        currentStatus: agent.status,
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string, 
    status: string,
    actorId: string,
    actorName: string
  ): Promise<Result<any, Error>> {
    try {
      const agent = await this.deps.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return Result.err(new Error('Agent not found'));
      }

      const updatedAgent = await this.deps.prisma.agent.update({
        where: { id: agentId },
        data: { status },
      });

      await logAction({
        actorType: ActorType.AGENT,
        actorId,
        actorName,
        action: 'AGENT_STATUS_CHANGED',
        resourceType: 'Agent',
        resourceId: agentId,
        afterState: { status },
      });

      broadcastEvent({
        type: 'AGENT_STATUS_CHANGED',
        agentId,
        data: { status },
      });

      return Result.ok(updatedAgent);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
