/**
 * Agent Dispatcher
 * 
 * Intelligent task assignment based on scoring algorithm.
 * Considers capability match, availability, historical success, and cost.
 */

import { Result, ValidationError } from '../../types/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent {
  id: string;
  handle: string;
  role: string;
  capabilities: string[];
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR' | 'DISABLED';
  currentLoad: number;
  maxLoad: number;
  trustLevel: number; // 0-1
  costPerHour?: number;
  performanceStats?: {
    successRate: number;
    averageTaskDuration: number;
    tasksCompleted: number;
  };
}

export interface Task {
  id: string;
  title: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredRole?: string;
  requiredTools: string[];
  estimatedEffort: number;
  projectPriority: number; // 0-100
}

export interface DispatchScore {
  taskId: string;
  agentId: string;
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
}

export interface DispatchRecommendation {
  taskId: string;
  recommendedAgentId: string | null;
  scores: DispatchScore[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

// ============================================================================
// SCORING WEIGHTS (configurable)
// ============================================================================

interface ScoringWeights {
  capabilityMatch: number;
  availability: number;
  historicalSuccess: number;
  costEfficiency: number;
  priorityAlignment: number;
  roleMatch: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  capabilityMatch: 0.25,
  availability: 0.20,
  historicalSuccess: 0.20,
  costEfficiency: 0.15,
  priorityAlignment: 0.10,
  roleMatch: 0.10
};

// ============================================================================
// DISPATCHER
// ============================================================================

export class AgentDispatcher {
  private weights: ScoringWeights;

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Calculate dispatch score for a task-agent pair
   */
  calculateScore(task: Task, agent: Agent): DispatchScore {
    const breakdown = {
      capabilityMatch: this.scoreCapabilityMatch(task, agent),
      availability: this.scoreAvailability(agent),
      historicalSuccess: this.scoreHistoricalSuccess(agent),
      costEfficiency: this.scoreCostEfficiency(task, agent),
      priorityAlignment: this.scorePriorityAlignment(task),
      roleMatch: this.scoreRoleMatch(task, agent)
    };

    const totalScore = 
      breakdown.capabilityMatch * this.weights.capabilityMatch +
      breakdown.availability * this.weights.availability +
      breakdown.historicalSuccess * this.weights.historicalSuccess +
      breakdown.costEfficiency * this.weights.costEfficiency +
      breakdown.priorityAlignment * this.weights.priorityAlignment +
      breakdown.roleMatch * this.weights.roleMatch;

    const reasoning = this.generateReasoning(task, agent, breakdown);

    return {
      taskId: task.id,
      agentId: agent.id,
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown,
      reasoning
    };
  }

  /**
   * Score how well agent's capabilities match task requirements
   */
  private scoreCapabilityMatch(task: Task, agent: Agent): number {
    if (task.requiredTools.length === 0) return 1.0;

    const matches = task.requiredTools.filter(tool => 
      agent.capabilities.includes(tool)
    ).length;

    return matches / task.requiredTools.length;
  }

  /**
   * Score agent availability
   */
  private scoreAvailability(agent: Agent): number {
    // Must be online
    if (agent.status !== 'ONLINE') return 0;

    const loadRatio = agent.currentLoad / agent.maxLoad;
    
    // Linear decrease as load increases
    // 0 load = 1.0, max load = 0.0
    return Math.max(0, 1 - loadRatio);
  }

  /**
   * Score based on historical success rate
   */
  private scoreHistoricalSuccess(agent: Agent): number {
    if (!agent.performanceStats) {
      // New agent - neutral score with slight penalty for unknown
      return 0.5;
    }

    const { successRate, tasksCompleted } = agent.performanceStats;
    
    // Weight by number of tasks (more tasks = more reliable score)
    const confidence = Math.min(tasksCompleted / 10, 1); // Max confidence at 10 tasks
    const weightedScore = successRate * confidence + 0.5 * (1 - confidence);

    return weightedScore;
  }

  /**
   * Score cost efficiency (lower cost = higher score)
   */
  private scoreCostEfficiency(task: Task, agent: Agent): number {
    if (!agent.costPerHour) return 0.5; // Neutral if no cost data

    // Normalize cost (assume $50-200 range as typical)
    const minCost = 50;
    const maxCost = 200;
    const normalizedCost = Math.max(0, Math.min(1, 
      (agent.costPerHour - minCost) / (maxCost - minCost)
    ));

    // Invert: lower cost = higher score
    return 1 - normalizedCost;
  }

  /**
   * Score priority alignment
   */
  private scorePriorityAlignment(task: Task): number {
    // Higher priority tasks should get best agents
    // This is a multiplier applied to other scores
    const priorityMultipliers: Record<Task['priority'], number> = {
      'CRITICAL': 1.0,
      'HIGH': 0.9,
      'MEDIUM': 0.7,
      'LOW': 0.5
    };

    return priorityMultipliers[task.priority];
  }

  /**
   * Score role match
   */
  private scoreRoleMatch(task: Task, agent: Agent): number {
    if (!task.requiredRole) return 1.0; // No preference
    if (agent.role === task.requiredRole) return 1.0;
    
    // Check for related roles
    const roleHierarchy: Record<string, string[]> = {
      'COORDINATOR': [],
      'TRADING_LEAD': ['FULLSTACK_DEV'],
      'FULLSTACK_DEV': ['INFRASTRUCTURE'],
      'INFRASTRUCTURE': ['FULLSTACK_DEV'],
      'SECURITY_QA': ['FULLSTACK_DEV'],
      'RESEARCHER': [],
      'CUSTOM': []
    };

    const related = roleHierarchy[task.requiredRole] || [];
    return related.includes(agent.role) ? 0.5 : 0.0;
  }

  /**
   * Generate human-readable reasoning for the score
   */
  private generateReasoning(
    task: Task, 
    agent: Agent, 
    breakdown: DispatchScore['breakdown']
  ): string[] {
    const reasons: string[] = [];

    if (breakdown.capabilityMatch === 1.0) {
      reasons.push('Has all required tools/capabilities');
    } else if (breakdown.capabilityMatch > 0) {
      reasons.push(`Has ${Math.round(breakdown.capabilityMatch * 100)}% of required capabilities`);
    } else {
      reasons.push('Missing required capabilities');
    }

    if (breakdown.availability >= 0.8) {
      reasons.push('High availability');
    } else if (breakdown.availability >= 0.5) {
      reasons.push('Moderate availability');
    } else {
      reasons.push('Low availability (high load)');
    }

    if (breakdown.roleMatch === 1.0) {
      reasons.push('Perfect role match');
    } else if (breakdown.roleMatch > 0) {
      reasons.push('Related role experience');
    }

    if (agent.performanceStats) {
      reasons.push(`${Math.round(agent.performanceStats.successRate * 100)}% historical success rate`);
    }

    return reasons;
  }

  /**
   * Find the best agent for a task
   */
  recommendAgent(task: Task, agents: Agent[]): DispatchRecommendation {
    // Filter to eligible agents only
    const eligibleAgents = agents.filter(agent => {
      // Must be online
      if (agent.status !== 'ONLINE') return false;
      
      // Must have capacity
      if (agent.currentLoad >= agent.maxLoad) return false;
      
      // Must have at least some capability match
      const capabilityMatch = this.scoreCapabilityMatch(task, agent);
      if (capabilityMatch === 0) return false;

      // Role requirement is strict
      if (task.requiredRole && agent.role !== task.requiredRole) {
        // Allow related roles at 50% score
        const roleMatch = this.scoreRoleMatch(task, agent);
        if (roleMatch === 0) return false;
      }

      return true;
    });

    if (eligibleAgents.length === 0) {
      return {
        taskId: task.id,
        recommendedAgentId: null,
        scores: [],
        confidence: 'LOW',
        reason: 'No eligible agents available'
      };
    }

    // Score all eligible agents
    const scores = eligibleAgents.map(agent => 
      this.calculateScore(task, agent)
    );

    // Sort by score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    const bestScore = scores[0];
    const secondBestScore = scores[1];

    // Calculate confidence based on score gap
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (bestScore.totalScore >= 0.8) {
      confidence = 'HIGH';
    } else if (bestScore.totalScore < 0.5) {
      confidence = 'LOW';
    }

    // If second best is close, lower confidence
    if (secondBestScore && (bestScore.totalScore - secondBestScore.totalScore) < 0.1) {
      confidence = 'MEDIUM';
    }

    return {
      taskId: task.id,
      recommendedAgentId: bestScore.agentId,
      scores,
      confidence,
      reason: `Best match: ${bestScore.reasoning.join(', ')}`
    };
  }

  /**
   * Batch dispatch: assign multiple tasks to available agents
   * Uses a greedy algorithm with conflict resolution
   */
  batchDispatch(tasks: Task[], agents: Agent[]): Result<Map<string, string>, ValidationError> {
    const assignments = new Map<string, string>();
    const agentLoads = new Map<string, number>(
      agents.map(a => [a.id, a.currentLoad])
    );

    // Sort tasks by priority (critical first)
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const task of sortedTasks) {
      // Update agent availability based on current assignments
      const currentAgents = agents.map(a => ({
        ...a,
        currentLoad: agentLoads.get(a.id) || a.currentLoad
      }));

      const recommendation = this.recommendAgent(task, currentAgents);

      if (recommendation.recommendedAgentId) {
        assignments.set(task.id, recommendation.recommendedAgentId);
        
        // Update load tracking
        const currentLoad = agentLoads.get(recommendation.recommendedAgentId) || 0;
        agentLoads.set(recommendation.recommendedAgentId, currentLoad + 1);
      }
    }

    return Result.ok(assignments);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createDispatcher(weights?: Partial<ScoringWeights>): AgentDispatcher {
  return new AgentDispatcher(weights);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export const PRIORITY_WEIGHTS = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

export function isAgentEligible(agent: Agent, task: Task): boolean {
  if (agent.status !== 'ONLINE') return false;
  if (agent.currentLoad >= agent.maxLoad) return false;
  if (task.requiredRole && agent.role !== task.requiredRole) return false;
  
  // Must have at least one required tool
  if (task.requiredTools.length > 0) {
    const hasTool = task.requiredTools.some(tool => 
      agent.capabilities.includes(tool)
    );
    if (!hasTool) return false;
  }
  
  return true;
}
