/**
 * Project Service
 * 
 * Handles all project-related business logic including:
 * - CRUD operations
 * - State transitions
 * - Dependency graph retrieval
 * - Project metrics calculation
 */

import { PrismaClient, ProjectState, Prisma, ActorType } from '@prisma/client';
import { Result, StateTransitionError, ValidationError } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectServiceDependencies {
  prisma: PrismaClient;
}

export interface CreateProjectInput {
  portfolioId: string;
  name: string;
  charter?: string;
  description?: string;
  objectives?: Array<{ objective: string; target: string; metric: string }>;
  successMetrics?: Record<string, unknown>;
  budgetAllocated?: number;
  plannedStart?: Date;
  plannedEnd?: Date;
  actorId: string;
  actorName: string;
}

export interface UpdateProjectInput {
  name?: string;
  charter?: string;
  description?: string;
  state?: ProjectState;
  objectives?: unknown[];
  budgetAllocated?: number;
  actualStart?: Date;
  actualEnd?: Date;
  stateChangeReason?: string;
}

export interface ProjectMetrics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  failedTasks: number;
  completionPercentage: number;
  healthScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  overdueTaskCount: number;
  averageTaskDuration?: number;
  budgetUtilization?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ProjectService {
  constructor(private deps: ProjectServiceDependencies) {}

  /**
   * Get a single project by ID with full details
   */
  async getProject(projectId: string): Promise<Result<any, Error>> {
    try {
      const project = await this.deps.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          portfolio: { select: { id: true, name: true } },
          milestones: {
            orderBy: { sequence: 'asc' },
            include: {
              _count: {
                select: {
                  tasks: { where: { status: { not: 'COMPLETE' } } },
                },
              },
            },
          },
          tasks: {
            where: { parentId: null },
            include: {
              assignee: { select: { id: true, handle: true, name: true, avatar: true } },
              subtasks: { select: { id: true, status: true } },
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          },
          decisions: { orderBy: { createdAt: 'desc' }, take: 10 },
          risks: { orderBy: { score: 'desc' } },
          artifacts: { orderBy: { createdAt: 'desc' }, take: 10 },
          _count: { select: { tasks: true, milestones: true } },
        },
      });

      if (!project) {
        return Result.err(new Error('Project not found'));
      }

      return Result.ok(project);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List projects with filtering
   */
  async listProjects(options: {
    portfolioId?: string;
    state?: ProjectState;
  }): Promise<Result<any[], Error>> {
    try {
      const projects = await this.deps.prisma.project.findMany({
        where: {
          ...(options.portfolioId && { portfolioId: options.portfolioId }),
          ...(options.state && { state: options.state }),
        },
        include: {
          portfolio: { select: { id: true, name: true } },
          _count: {
            select: {
              tasks: { where: { status: { not: 'COMPLETE' } } },
              milestones: true,
            },
          },
          tasks: {
            where: { status: { in: ['BLOCKED', 'FAILED'] } },
            select: { 
              id: true, number: true, title: true, 
              status: true, blockerType: true 
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(projects);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Result<any, Error>> {
    try {
      const project = await this.deps.prisma.project.create({
        data: {
          portfolioId: input.portfolioId,
          name: input.name,
          charter: input.charter,
          description: input.description,
          objectives: input.objectives,
          successMetrics: input.successMetrics,
          budgetAllocated: input.budgetAllocated,
          plannedStart: input.plannedStart,
          plannedEnd: input.plannedEnd,
          state: 'PROPOSED',
          stateHistory: [{
            state: 'PROPOSED',
            timestamp: new Date().toISOString(),
            reason: 'Project created',
          }],
        },
        include: {
          portfolio: { select: { id: true, name: true } },
        },
      });

      await logAction({
        actorType: ActorType.AGENT,
        actorId: input.actorId,
        actorName: input.actorName,
        action: 'PROJECT_CREATED',
        resourceType: 'Project',
        resourceId: project.id,
        afterState: project as unknown as Record<string, unknown>,
      });

      broadcastEvent({
        type: 'PROJECT_CREATED',
        projectId: project.id,
        data: project,
      });

      return Result.ok(project);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
    actorId: string,
    actorName: string
  ): Promise<Result<any, Error>> {
    try {
      const currentProject = await this.deps.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!currentProject) {
        return Result.err(new Error('Project not found'));
      }

      const updateData: Prisma.ProjectUpdateInput = {};
      const stateHistory = [...(currentProject.stateHistory as any[] || [])];

      if (input.name !== undefined) updateData.name = input.name;
      if (input.charter !== undefined) updateData.charter = input.charter;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.objectives !== undefined) updateData.objectives = input.objectives;
      if (input.budgetAllocated !== undefined) updateData.budgetAllocated = input.budgetAllocated;
      if (input.actualStart !== undefined) updateData.actualStart = input.actualStart;
      if (input.actualEnd !== undefined) updateData.actualEnd = input.actualEnd;

      // Handle state change with history
      if (input.state && input.state !== currentProject.state) {
        updateData.state = input.state;
        stateHistory.push({
          state: input.state,
          timestamp: new Date().toISOString(),
          reason: input.stateChangeReason || 'State updated via API',
        });
        updateData.stateHistory = stateHistory;

        // Auto-set actual dates on certain state transitions
        if (input.state === 'EXECUTING' && !currentProject.actualStart) {
          updateData.actualStart = new Date();
        }
        if ((input.state === 'COMPLETED' || input.state === 'FAILED') && !currentProject.actualEnd) {
          updateData.actualEnd = new Date();
        }
      }

      const updatedProject = await this.deps.prisma.project.update({
        where: { id: projectId },
        data: updateData,
        include: {
          portfolio: { select: { id: true, name: true } },
        },
      });

      await logAction({
        actorType: ActorType.AGENT,
        actorId,
        actorName,
        action: input.state ? 'PROJECT_STATE_CHANGED' : 'PROJECT_UPDATED',
        resourceType: 'Project',
        resourceId: projectId,
        beforeState: currentProject as unknown as Record<string, unknown>,
        afterState: updatedProject as unknown as Record<string, unknown>,
      });

      broadcastEvent({
        type: 'PROJECT_UPDATED',
        projectId: updatedProject.id,
        changes: { state: input.state },
      });

      return Result.ok(updatedProject);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get project metrics
   */
  async getProjectMetrics(projectId: string): Promise<Result<ProjectMetrics, Error>> {
    try {
      const project = await this.deps.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          _count: { select: { tasks: true } },
        },
      });

      if (!project) {
        return Result.err(new Error('Project not found'));
      }

      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId },
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
      const inProgressTasks = tasks.filter(t => ['RUNNING', 'ASSIGNED'].includes(t.status)).length;
      const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
      const failedTasks = tasks.filter(t => t.status === 'FAILED').length;
      
      const now = new Date();
      const overdueTaskCount = tasks.filter(
        t => t.dueDate && t.dueDate < now && t.status !== 'COMPLETE' && t.status !== 'CANCELED'
      ).length;

      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate health score (0-100)
      let healthScore = completionPercentage;
      if (blockedTasks > 0) healthScore -= (blockedTasks / totalTasks) * 20;
      if (failedTasks > 0) healthScore -= (failedTasks / totalTasks) * 30;
      if (overdueTaskCount > 0) healthScore -= (overdueTaskCount / totalTasks) * 15;
      healthScore = Math.max(0, Math.min(100, healthScore));

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (failedTasks > 3 || blockedTasks > 5 || overdueTaskCount > 5) {
        riskLevel = 'CRITICAL';
      } else if (failedTasks > 1 || blockedTasks > 2 || overdueTaskCount > 2) {
        riskLevel = 'HIGH';
      } else if (blockedTasks > 0 || overdueTaskCount > 0) {
        riskLevel = 'MEDIUM';
      }

      const metrics: ProjectMetrics = {
        projectId,
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        failedTasks,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        healthScore: Math.round(healthScore * 100) / 100,
        riskLevel,
        overdueTaskCount,
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get dependency graph for a project
   */
  async getDependencyGraph(projectId: string): Promise<Result<any, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
          assigneeId: true,
          dependencies: true,
          dependents: true,
        },
      });

      // Build graph structure
      const nodes = tasks.map(t => ({
        id: t.id,
        number: t.number,
        title: t.title,
        status: t.status,
        priority: t.priority,
        hasAssignee: !!t.assigneeId,
      }));

      const edges: { from: string; to: string }[] = [];
      for (const task of tasks) {
        for (const depId of task.dependencies || []) {
          if (tasks.find(t => t.id === depId)) {
            edges.push({ from: task.id, to: depId });
          }
        }
      }

      // Find tasks ready to proceed
      const readyTasks = tasks.filter(t => {
        if (t.status !== 'QUEUED' && t.status !== 'AWAITING_DEPENDENCY') return false;
        return (t.dependencies || []).every(depId => {
          const dep = tasks.find(task => task.id === depId);
          return dep?.status === 'COMPLETE' || dep?.status === 'CANCELED';
        });
      });

      // Find blocked tasks
      const blockedTasks = tasks.filter(t => {
        if (t.status !== 'QUEUED' && t.status !== 'AWAITING_DEPENDENCY') return false;
        return (t.dependencies || []).some(depId => {
          const dep = tasks.find(task => task.id === depId);
          return dep?.status !== 'COMPLETE' && dep?.status !== 'CANCELED';
        });
      });

      return Result.ok({
        nodes,
        edges,
        readyTasks: readyTasks.map(t => t.id),
        blockedTasks: blockedTasks.map(t => ({ id: t.id, blockedBy: t.dependencies })),
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Resolve dependencies and update task statuses
   */
  async resolveDependencies(
    projectId: string,
    actorId: string,
    actorName: string
  ): Promise<Result<{ updated: string[]; errors: string[] }, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
      });

      const updated: string[] = [];
      const errors: string[] = [];

      for (const task of tasks) {
        // Only check QUEUED or AWAITING_DEPENDENCY tasks
        if (!['QUEUED', 'AWAITING_DEPENDENCY'].includes(task.status)) continue;

        const deps = task.dependencies as string[] || [];
        const allMet = deps.every(depId => {
          const dep = tasks.find(t => t.id === depId);
          return dep?.status === 'COMPLETE' || dep?.status === 'CANCELED';
        });

        if (allMet && deps.length > 0) {
          // Update to READY
          const statusHistory = [...(task.statusHistory as any[] || [])];
          statusHistory.push({
            status: 'READY',
            timestamp: new Date().toISOString(),
            actor: actorName,
            reason: 'All dependencies resolved',
          });

          await this.deps.prisma.task.update({
            where: { id: task.id },
            data: { status: 'READY', statusHistory },
          });

          updated.push(task.id);

          await logAction({
            actorType: ActorType.AGENT,
            actorId,
            actorName,
            action: 'TASK_STATUS_CHANGED',
            resourceType: 'Task',
            resourceId: task.id,
            metadata: { reason: 'Dependencies resolved', from: task.status, to: 'READY' },
          });
        }
      }

      return Result.ok({ updated, errors });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
