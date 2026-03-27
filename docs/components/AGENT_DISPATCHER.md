# AgentDispatcher Specification

**File:** \`src/core/dispatcher/scoring.ts\`  
**Purpose:** Intelligent task-to-agent assignment using scoring algorithm  
**Dependencies:** \`src/types/domain.ts\`

---

## Overview

The AgentDispatcher calculates a score for each agent-task pair and recommends the best match. It considers:
- Capability match (does agent have required skills?)
- Availability (current workload)
- Historical success rate
- Cost efficiency
- Priority alignment

---

## Types

\`\`\`typescript
interface Agent {
  id: string;
  handle: string;
  role: AgentRole;
  capabilities: string[];     // e.g., ['react', 'typescript', 'trading']
  currentLoad: number;        // Active tasks
  maxLoad: number;            // Max concurrent tasks
  trustLevel: number;         // 0-1, historical reliability
  costPerHour?: number;       // Cost in USD
  status: AgentStatus;
  performanceStats?: {
    successRate: number;      // 0-1
    avgTaskDuration: number;  // hours
  };
}

interface Task {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  requiredRole?: string;      // e.g., 'FULLSTACK_DEV'
  requiredTools: string[];    // e.g., ['github', 'aws']
  estimatedEffort?: number;   // hours
}

interface DispatchScore {
  taskId: string;
  agentId: string;
  score: number;              // 0-1, higher is better
  breakdown: {
    capabilityMatch: number;  // 0-1
    availability: number;     // 0-1
    historicalSuccess: number;// 0-1
    costEfficiency: number;   // 0-1 (inverse of cost)
    priorityAlignment: number;// 0-1
  };
}

interface DispatchRecommendation {
  taskId: string;
  recommendedAgentId: string | null;
  scores: DispatchScore[];    // All agents sorted by score
  reason: string;
}

interface ScoringWeights {
  capability: number;     // Default: 0.35
  availability: number;   // Default: 0.25
  historical: number;     // Default: 0.20
  cost: number;           // Default: 0.10
  priority: number;       // Default: 0.10
}
\`\`\`

---

## Usage

### Creating a Dispatcher

\`\`\`typescript
import { createDispatcher, PRIORITY_WEIGHTS } from '@/core/dispatcher/scoring';

// Use default weights
const dispatcher = createDispatcher();

// Or custom weights
const dispatcher = createDispatcher({
  capability: 0.40,
  availability: 0.30,
  historical: 0.15,
  cost: 0.05,
  priority: 0.10,
});
\`\`\`

### Recommending an Agent

\`\`\`typescript
const task: Task = {
  id: 'task_123',
  title: 'Build trading dashboard',
  type: 'FEATURE',
  priority: 'HIGH',
  requiredRole: 'FULLSTACK_DEV',
  requiredTools: ['react', 'typescript'],
  estimatedEffort: 8,
};

const agents: Agent[] = [
  { id: 'agent_1', handle: '@claw-builder', capabilities: ['react', 'typescript'], ... },
  { id: 'agent_2', handle: '@claw-trader', capabilities: ['trading', 'python'], ... },
];

const recommendation = dispatcher.recommendAgent(task, agents);
// Returns: DispatchRecommendation

console.log(recommendation.recommendedAgentId); // 'agent_1' (better capability match)
console.log(recommendation.scores[0].score);    // 0.85
console.log(recommendation.scores[0].breakdown);
// { capabilityMatch: 1.0, availability: 0.8, ... }
\`\`\`

### Batch Dispatch

\`\`\`typescript
const tasks: Task[] = [task1, task2, task3];
const agents: Agent[] = [agent1, agent2, agent3];

const assignments = dispatcher.batchDispatch(tasks, agents);
// Returns: Map<taskId, agentId | null>

// Example output:
// {
//   'task_1': 'agent_1',
//   'task_2': 'agent_3',
//   'task_3': null,  // No suitable agent
// }
\`\`\`

### Checking Eligibility

\`\`\`typescript
const isEligible = dispatcher.isAgentEligible(agent, task);
// Returns: boolean

// An agent is eligible if:
// - Status is ONLINE or BUSY (not OFFLINE, ERROR, DISABLED)
// - Has required capabilities (if specified)
// - Current load < max load
// - Matches required role (if specified)
\`\`\`

---

## Scoring Algorithm

### 1. Capability Match (35% weight)

\`\`\`
requiredTools = ['react', 'typescript']
agent.capabilities = ['react', 'typescript', 'node']

match = intersection(requiredTools, agent.capabilities).length / requiredTools.length
      = 2 / 2 = 1.0
\`\`\`

### 2. Availability (25% weight)

\`\`\`
availability = 1 - (currentLoad / maxLoad)

If currentLoad = 1, maxLoad = 3:
availability = 1 - (1/3) = 0.67
\`\`\`

### 3. Historical Success (20% weight)

\`\`\`
historical = performanceStats?.successRate ?? 0.5

If no history, default to 0.5 (neutral)
\`\`\`

### 4. Cost Efficiency (10% weight)

\`\`\`
// Inverse of cost (cheaper is better)
maxCost = max(agents.map(a => a.costPerHour ?? 100))
costEfficiency = 1 - ((agent.costPerHour ?? 50) / maxCost)
\`\`\`

### 5. Priority Alignment (10% weight)

\`\`\`
// Higher priority tasks should go to more trusted agents
priorityWeight = { LOW: 0.2, MEDIUM: 0.5, HIGH: 0.8, CRITICAL: 1.0 }
priorityAlignment = agent.trustLevel * priorityWeight[task.priority]
\`\`\`

### Final Score

\`\`\`
score = (capability * 0.35) +
        (availability * 0.25) +
        (historical * 0.20) +
        (cost * 0.10) +
        (priority * 0.10)
\`\`\`

---

## Integration

### DispatchService

\`\`\`typescript
async recommendAgent(taskId: string): Promise<Result<DispatchResult, Error>> {
  const task = await this.deps.prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  
  if (!task) {
    return Result.err(new Error('Task not found'));
  }

  // Get available agents
  const agents = await this.deps.prisma.agent.findMany({
    where: {
      status: { in: ['ONLINE', 'BUSY'] },
      isActive: true,
    },
  });

  // Create dispatcher and get recommendation
  const dispatcher = createDispatcher();
  const recommendation = dispatcher.recommendAgent(
    {
      id: task.id,
      title: task.title,
      type: task.type as TaskType,
      priority: task.priority as TaskPriority,
      requiredRole: task.requiredRole || undefined,
      requiredTools: task.requiredTools,
      estimatedEffort: task.estimatedEffort || undefined,
    },
    agents.map(a => ({
      id: a.id,
      handle: a.handle,
      role: a.role as AgentRole,
      capabilities: a.capabilities,
      currentLoad: a.currentLoad,
      maxLoad: a.maxLoad,
      trustLevel: a.trustLevel,
      costPerHour: a.costPerHour ? Number(a.costPerHour) : undefined,
      status: a.status as AgentStatus,
      performanceStats: a.performanceStats as any,
    }))
  );

  return Result.ok({
    taskId,
    recommendation,
  });
}
\`\`\`

### Batch Auto-Assign

\`\`\`typescript
async batchDispatch(actorId: string): Promise<Result<BatchDispatchResult, Error>> {
  // Get all READY tasks
  const readyTasks = await this.deps.prisma.task.findMany({
    where: { status: 'READY', isDeleted: false },
  });

  // Get available agents
  const agents = await this.deps.prisma.agent.findMany({
    where: {
      status: { in: ['ONLINE', 'BUSY'] },
      isActive: true,
    },
  });

  const dispatcher = createDispatcher();
  
  // Convert to dispatcher types
  const tasks = readyTasks.map(t => ({ ... }));
  const agentList = agents.map(a => ({ ... }));

  // Get assignments
  const assignments = dispatcher.batchDispatch(tasks, agentList);

  // Apply assignments
  const results: string[] = [];
  for (const [taskId, agentId] of assignments.entries()) {
    if (agentId) {
      await this.deps.prisma.task.update({
        where: { id: taskId },
        data: {
          assigneeId: agentId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });
      results.push(\`Task \${taskId} assigned to \${agentId}\`);
    }
  }

  return Result.ok({
    assigned: results.length,
    unassigned: readyTasks.length - results.length,
    details: results,
  });
}
\`\`\`

---

## Priority Weights Preset

\`\`\`typescript
export const PRIORITY_WEIGHTS: ScoringWeights = {
  capability: 0.35,    // Most important: can they do the work?
  availability: 0.25,  // Second: do they have capacity?
  historical: 0.20,    // Third: have they succeeded before?
  cost: 0.10,          // Fourth: are they cost-effective?
  priority: 0.10,      // Fifth: is it a good match for priority?
};
\`\`\`

---

## Rules

1. **Agents with status OFFLINE, ERROR, or DISABLED are never eligible**
2. **Agents at max load (currentLoad >= maxLoad) are not eligible**
3. **If requiredRole is specified, agent must match**
4. **Capability match is binary per skill** (has it or doesn't)
5. **Score of 0 means not eligible**, > 0 means eligible
6. **Highest score wins**, ties broken by trust level

---

## Testing

\`\`\`typescript
describe('AgentDispatcher', () => {
  const task: Task = {
    id: 'task_1',
    title: 'Test Task',
    type: 'FEATURE',
    priority: 'HIGH',
    requiredTools: ['react', 'typescript'],
  };

  it('should prefer agent with better capability match', () => {
    const agents: Agent[] = [
      {
        id: 'agent_1',
        handle: '@builder',
        role: 'FULLSTACK_DEV',
        capabilities: ['react', 'typescript', 'node'],
        currentLoad: 1,
        maxLoad: 3,
        trustLevel: 0.8,
        status: 'ONLINE',
      },
      {
        id: 'agent_2',
        handle: '@trader',
        role: 'TRADING_LEAD',
        capabilities: ['python', 'trading'],
        currentLoad: 0,
        maxLoad: 3,
        trustLevel: 0.9,
        status: 'ONLINE',
      },
    ];

    const dispatcher = createDispatcher();
    const rec = dispatcher.recommendAgent(task, agents);

    expect(rec.recommendedAgentId).toBe('agent_1'); // Has react+typescript
  });

  it('should not recommend agent at max load', () => {
    const agents: Agent[] = [
      {
        id: 'agent_1',
        handle: '@busy',
        role: 'FULLSTACK_DEV',
        capabilities: ['react'],
        currentLoad: 3,
        maxLoad: 3,  // At capacity
        trustLevel: 0.8,
        status: 'ONLINE',
      },
    ];

    const dispatcher = createDispatcher();
    const rec = dispatcher.recommendAgent(task, agents);

    expect(rec.recommendedAgentId).toBeNull();
  });
});
\`\`\`

