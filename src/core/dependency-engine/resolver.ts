/**
 * Dependency Resolution Engine
 * 
 * Manages task dependency graphs and determines which tasks can proceed.
 * Implements topological sorting and cycle detection.
 */

import { Result, DependencyError } from '../../types/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface DependencyNode {
  id: string;
  status: string;
  dependencies: string[];
  dependents: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>; // taskId -> set of dependency taskIds
}

export interface Cycle {
  path: string[];
  description: string;
}

export interface ResolutionResult {
  readyTasks: string[];
  blockedTasks: string[];
  cycles: Cycle[];
}

// ============================================================================
// GRAPH BUILDER
// ============================================================================

export class DependencyGraphBuilder {
  private nodes = new Map<string, DependencyNode>();
  private edges = new Map<string, Set<string>>();
  private reverseEdges = new Map<string, Set<string>>(); // dependent -> set of tasks that depend on it

  addNode(node: DependencyNode): this {
    this.nodes.set(node.id, { ...node });
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }
    if (!this.reverseEdges.has(node.id)) {
      this.reverseEdges.set(node.id, new Set());
    }
    return this;
  }

  addEdge(from: string, to: string): this {
    // 'from' depends on 'to' (to must complete before from can start)
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    if (!this.reverseEdges.has(to)) {
      this.reverseEdges.set(to, new Set());
    }
    this.edges.get(from)!.add(to);
    this.reverseEdges.get(to)!.add(from);
    return this;
  }

  build(): DependencyGraph {
    // Update node dependencies/dependents from edges
    for (const [nodeId, node] of this.nodes) {
      const deps = this.edges.get(nodeId) || new Set();
      const dependents = this.reverseEdges.get(nodeId) || new Set();
      node.dependencies = Array.from(deps);
      node.dependents = Array.from(dependents);
    }

    return {
      nodes: new Map(this.nodes),
      edges: new Map(this.edges)
    };
  }
}

// ============================================================================
// DEPENDENCY RESOLVER
// ============================================================================

export class DependencyResolver {
  private readonly terminalStatuses = ['COMPLETE', 'CANCELED'];

  /**
   * Build a dependency graph from a list of tasks
   */
  buildGraph(tasks: Array<{ id: string; status: string; dependencies: string[] }>): DependencyGraph {
    const builder = new DependencyGraphBuilder();
    
    // First pass: add all nodes
    for (const task of tasks) {
      builder.addNode({
        id: task.id,
        status: task.status,
        dependencies: task.dependencies,
        dependents: []
      });
    }
    
    // Second pass: add edges
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        builder.addEdge(task.id, depId);
      }
    }
    
    return builder.build();
  }

  /**
   * Detect cycles in the dependency graph
   * Returns empty array if no cycles
   */
  detectCycles(graph: DependencyGraph): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependencies = graph.edges.get(nodeId) || new Set();
      for (const depId of dependencies) {
        if (!graph.nodes.has(depId)) {
          // Skip missing dependencies - will be caught by validation
          continue;
        }

        if (!visited.has(depId)) {
          if (dfs(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          const cycleStart = path.indexOf(depId);
          const cyclePath = path.slice(cycleStart);
          cycles.push({
            path: cyclePath,
            description: `Cycle detected: ${cyclePath.join(' → ')} → ${depId}`
          });
          return true;
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Find all tasks that are now unblocked (dependencies satisfied)
   */
  findUnblockedTasks(graph: DependencyGraph): string[] {
    const unblocked: string[] = [];

    for (const [taskId, node] of graph.nodes) {
      // Only check tasks that are in QUEUED or AWAITING_DEPENDENCY status
      if (!['QUEUED', 'AWAITING_DEPENDENCY'].includes(node.status)) {
        continue;
      }

      const dependencies = graph.edges.get(taskId) || new Set();
      let allMet = true;

      for (const depId of dependencies) {
        const depNode = graph.nodes.get(depId);
        if (!depNode) {
          // Missing dependency - treat as unmet
          allMet = false;
          break;
        }

        if (!this.terminalStatuses.includes(depNode.status)) {
          allMet = false;
          break;
        }
      }

      if (allMet) {
        unblocked.push(taskId);
      }
    }

    return unblocked;
  }

  /**
   * Find all tasks that would be unblocked if a specific task completes
   */
  getUnblockedByCompletion(graph: DependencyGraph, completedTaskId: string): string[] {
    const unblocked: string[] = [];
    const dependents = graph.nodes.get(completedTaskId)?.dependents || [];

    for (const dependentId of dependents) {
      const dependent = graph.nodes.get(dependentId);
      if (!dependent) continue;

      // Check if all other dependencies are also satisfied
      const deps = graph.edges.get(dependentId) || new Set();
      let allMet = true;

      for (const depId of deps) {
        if (depId === completedTaskId) continue; // We just completed this one
        
        const depNode = graph.nodes.get(depId);
        if (!depNode || !this.terminalStatuses.includes(depNode.status)) {
          allMet = false;
          break;
        }
      }

      if (allMet && ['QUEUED', 'AWAITING_DEPENDENCY'].includes(dependent.status)) {
        unblocked.push(dependentId);
      }
    }

    return unblocked;
  }

  /**
   * Get the critical path (longest dependency chain)
   */
  getCriticalPath(graph: DependencyGraph, fromTaskId?: string): string[] {
    const memo = new Map<string, number>();
    const pathMemo = new Map<string, string[]>();

    const getPathLength = (taskId: string): number => {
      if (memo.has(taskId)) return memo.get(taskId)!;

      const dependencies = graph.edges.get(taskId) || new Set();
      if (dependencies.size === 0) {
        memo.set(taskId, 1);
        pathMemo.set(taskId, [taskId]);
        return 1;
      }

      let maxLength = 0;
      let bestDep: string | null = null;

      for (const depId of dependencies) {
        const length = getPathLength(depId);
        if (length > maxLength) {
          maxLength = length;
          bestDep = depId;
        }
      }

      memo.set(taskId, maxLength + 1);
      
      const path = bestDep 
        ? [...pathMemo.get(bestDep)!, taskId]
        : [taskId];
      pathMemo.set(taskId, path);

      return maxLength + 1;
    };

    if (fromTaskId) {
      getPathLength(fromTaskId);
      return pathMemo.get(fromTaskId) || [fromTaskId];
    }

    // Find the longest path from any node
    let longestPath: string[] = [];
    for (const taskId of graph.nodes.keys()) {
      getPathLength(taskId);
      const path = pathMemo.get(taskId)!;
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return longestPath;
  }

  /**
   * Validate a dependency graph for consistency
   */
  validate(graph: DependencyGraph): Result<void, DependencyError> {
    const errors: string[] = [];

    // Check for cycles
    const cycles = this.detectCycles(graph);
    if (cycles.length > 0) {
      return Result.err(new DependencyError(
        'Dependency cycle detected',
        cycles[0].path[0],
        cycles[0].path
      ));
    }

    // Check for missing dependencies
    for (const [taskId, node] of graph.nodes) {
      for (const depId of node.dependencies) {
        if (!graph.nodes.has(depId)) {
          errors.push(`Task ${taskId} depends on non-existent task ${depId}`);
        }
      }
    }

    if (errors.length > 0) {
      return Result.err(new DependencyError(
        errors.join('; '),
        '',
        []
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Resolve all dependencies and return comprehensive status
   */
  resolve(graph: DependencyGraph): Result<ResolutionResult, DependencyError> {
    const validation = this.validate(graph);
    if (!validation.ok) {
      return Result.err(validation.error);
    }

    const readyTasks = this.findUnblockedTasks(graph);
    const cycles: Cycle[] = []; // Already validated no cycles

    // Blocked tasks are those with unmet dependencies
    const blockedTasks: string[] = [];
    for (const [taskId, node] of graph.nodes) {
      if (node.status === 'QUEUED' && !readyTasks.includes(taskId)) {
        blockedTasks.push(taskId);
      }
    }

    return Result.ok({
      readyTasks,
      blockedTasks,
      cycles
    });
  }
}

// ============================================================================
// SERVICE INTEGRATION
// ============================================================================

/**
 * Service-level dependency resolver that works with Prisma models
 */
export async function resolveTaskDependencies(
  prisma: {
    task: {
      findMany: (args: {
        where: { projectId: string };
        select: {
          id: true;
          status: true;
          dependencies: true;
          dependents: true;
        };
      }) => Promise<Array<{
        id: string;
        status: string;
        dependencies: string[];
        dependents: string[];
      }>>;
    };
  },
  projectId: string
): Promise<Result<ResolutionResult, DependencyError>> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      id: true,
      status: true,
      dependencies: true,
      dependents: true
    }
  });

  const resolver = new DependencyResolver();
  const graph = resolver.buildGraph(tasks);
  
  return resolver.resolve(graph);
}
