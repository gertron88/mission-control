/**
 * Dependency Service
 * 
 * Wraps the dependency resolution engine for use by API routes.
 * Provides high-level operations for dependency management.
 */

import { PrismaClient, TaskStatus } from '@prisma/client';
import { Result, DependencyError } from '@/types/domain';
import { 
  DependencyResolver, 
  DependencyGraph,
  type ResolutionResult 
} from '@/core/dependency-engine/resolver';

// ============================================================================
// TYPES
// ============================================================================

export interface DependencyServiceDependencies {
  prisma: PrismaClient;
}

export interface DependencyGraphResult {
  graph: DependencyGraph;
  cycles: Array<{ path: string[]; description: string }>;
  readyTasks: string[];
  blockedTasks: string[];
}

export interface ResolveDependenciesInput {
  projectId: string;
  autoUpdate?: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

export class DependencyService {
  private resolver: DependencyResolver;

  constructor(private deps: DependencyServiceDependencies) {
    this.resolver = new DependencyResolver();
  }

  /**
   * Build and validate a dependency graph for a project
   */
  async buildDependencyGraph(projectId: string): Promise<Result<DependencyGraphResult, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          status: true,
          dependencies: true,
          dependents: true,
        },
      });

      const graph = this.resolver.buildGraph(tasks);
      const cycles = this.resolver.detectCycles(graph);
      const readyTasks = this.resolver.findUnblockedTasks(graph);
      
      const blockedTasks: string[] = [];
      for (const [taskId, node] of graph.nodes) {
        if (node.status === 'QUEUED' && !readyTasks.includes(taskId)) {
          blockedTasks.push(taskId);
        }
      }

      return Result.ok({ graph, cycles, readyTasks, blockedTasks });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate a dependency graph and return any errors
   */
  async validateDependencies(projectId: string): Promise<Result<{
    valid: boolean;
    cycles: Array<{ path: string[]; description: string }>;
    missingDependencies: string[];
  }, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          status: true,
          dependencies: true,
        },
      });

      const graph = this.resolver.buildGraph(tasks);
      const cycles = this.resolver.detectCycles(graph);
      
      const missingDependencies: string[] = [];
      for (const [taskId, node] of graph.nodes) {
        for (const depId of node.dependencies) {
          if (!graph.nodes.has(depId)) {
            missingDependencies.push(`${taskId} depends on ${depId} (not found)`);
          }
        }
      }

      return Result.ok({
        valid: cycles.length === 0 && missingDependencies.length === 0,
        cycles,
        missingDependencies,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Resolve dependencies and optionally update task statuses
   */
  async resolveDependencies(
    input: ResolveDependenciesInput,
    actorId?: string,
    actorName?: string
  ): Promise<Result<{
    resolved: string[];
    stillBlocked: string[];
    cycles: Array<{ path: string[]; description: string }>;
  }, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId: input.projectId, isDeleted: false },
      });

      const graph = this.resolver.buildGraph(
        tasks.map(t => ({
          id: t.id,
          status: t.status,
          dependencies: t.dependencies as string[] || [],
        }))
      );

      const result = this.resolver.resolve(graph);
      
      if (!result.ok) {
        return Result.err(result.error);
      }

      const { readyTasks, blockedTasks, cycles } = result.value;

      // Optionally update statuses
      if (input.autoUpdate && actorId && actorName) {
        for (const taskId of readyTasks) {
          const task = tasks.find(t => t.id === taskId);
          if (task && task.status === 'AWAITING_DEPENDENCY') {
            const statusHistory = [...(task.statusHistory as any[] || [])];
            statusHistory.push({
              status: 'READY',
              timestamp: new Date().toISOString(),
              actor: actorName,
              reason: 'Dependencies resolved',
            });

            await this.deps.prisma.task.update({
              where: { id: taskId },
              data: { status: 'READY', statusHistory },
            });
          }
        }
      }

      return Result.ok({
        resolved: readyTasks,
        stillBlocked: blockedTasks,
        cycles,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get tasks that would be unblocked if a specific task completes
   */
  async getUnblockedByCompletion(
    projectId: string, 
    completedTaskId: string
  ): Promise<Result<string[], Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          status: true,
          dependencies: true,
          dependents: true,
        },
      });

      const graph = this.resolver.buildGraph(tasks);
      const unblocked = this.resolver.getUnblockedByCompletion(graph, completedTaskId);

      return Result.ok(unblocked);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the critical path for a project or specific task
   */
  async getCriticalPath(
    projectId: string, 
    fromTaskId?: string
  ): Promise<Result<{
    path: string[];
    tasks: Array<{ id: string; title: string; status: string }>;
    totalTasks: number;
  }, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          title: true,
          status: true,
          dependencies: true,
        },
      });

      const graph = this.resolver.buildGraph(
        tasks.map(t => ({
          id: t.id,
          status: t.status,
          dependencies: t.dependencies as string[] || [],
        }))
      );

      const path = this.resolver.getCriticalPath(graph, fromTaskId);
      
      const pathTasks = path
        .map(id => tasks.find(t => t.id === id))
        .filter(Boolean)
        .map(t => ({ id: t!.id, title: t!.title, status: t!.status }));

      return Result.ok({
        path,
        tasks: pathTasks,
        totalTasks: path.length,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if adding a dependency would create a cycle
   */
  async wouldCreateCycle(
    projectId: string,
    taskId: string,
    dependencyId: string
  ): Promise<Result<boolean, Error>> {
    try {
      const tasks = await this.deps.prisma.task.findMany({
        where: { projectId, isDeleted: false },
        select: {
          id: true,
          status: true,
          dependencies: true,
        },
      });

      // Add the hypothetical dependency
      const modifiedTasks = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            dependencies: [...(t.dependencies as string[] || []), dependencyId],
          };
        }
        return t;
      });

      const graph = this.resolver.buildGraph(modifiedTasks);
      const cycles = this.resolver.detectCycles(graph);

      return Result.ok(cycles.length > 0);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
