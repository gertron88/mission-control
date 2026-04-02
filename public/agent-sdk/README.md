# Mission Control Agent Client SDK v2.0

WebSocket/SSE-based agent client for connecting to Mission Control dashboard.

## Quick Start

```javascript
const { MissionControlAgent } = require('@mission-control/agent-client');

const agent = new MissionControlAgent({
  missionControlUrl: 'https://mission-control-sage-mu.vercel.app',
  apiKey: 'your-api-key-here',
  agentId: 'your-agent-id-here', // Optional, will register if not provided
  capabilities: ['ETL', 'Python', 'ML'],
});

// Connect and start
await agent.connect();

// Handle incoming tasks
agent.onTask(async (task) => {
  console.log('Received task:', task);
  
  // Report progress
  agent.reportProgress(task.id, 25);
  
  // Do the work...
  const result = await doWork(task);
  
  // Complete with summary report
  await agent.completeTask(task.id, result, {
    outcome: 'success',
    duration: 3600000,
    notes: 'Task completed with optimizations',
    deliverables: ['code', 'docs'],
  });
});

// Handle kill switch
agent.onKill(() => {
  console.log('Kill switch activated!');
  process.exit(0);
});

// Handle planning doc requirement
agent.onPlanningRequired(async (task) => {
  console.log('Task requires planning doc:', task.id);
  // Create and submit planning document
  await agent.submitPlanningDoc(task.projectId, {
    scope: 'Implement feature X',
    approach: 'Use library Y with pattern Z',
    estimatedHours: 8,
    risks: ['Dependency version mismatch'],
    deliverables: ['Code', 'Tests', 'Documentation'],
  });
});
```

## Configuration

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `missionControlUrl` | ✅ | - | Mission Control dashboard URL |
| `apiKey` | ✅ | - | Agent API key from dashboard |
| `agentId` | ❌ | null | Existing agent ID (auto-registered if not provided) |
| `heartbeatInterval` | ❌ | 30000 | Heartbeat interval in ms |
| `pollInterval` | ❌ | 30000 | Task polling interval (SSE mode) |
| `capabilities` | ❌ | [] | Array of agent capabilities |
| `useWebSocket` | ❌ | true | Use WebSocket (falls back to SSE) |

## Task Claiming

The agent can receive tasks in two ways:

### 1. Push (WebSocket/SSE)
Mission Control assigns tasks directly to the agent:
```javascript
agent.onTask(async (task) => {
  // Task received, start working
});
```

### 2. Pull (Polling)
Agent polls for available tasks:
```javascript
// Automatic in SSE mode
// Agent checks /api/tasks?status=READY every 30s
// Claims matching task by capabilities
```

## Planning Documents

**No task can start without an approved planning document.**

```javascript
// Submit planning doc for a project
await agent.submitPlanningDoc('project-id', {
  scope: 'What will be built',
  approach: 'How it will be built',
  estimatedHours: 8,
  requiredTools: ['github', 'aws'],
  dependencies: ['task-001', 'task-002'],
  risks: ['Potential issues'],
  deliverables: ['Code', 'Tests', 'Docs'],
  validationCriteria: ['Tests pass', 'Performance > 100req/s'],
});

// Handle tasks that require planning
agent.onPlanningRequired(async (task) => {
  // Create planning doc before starting task
  await agent.submitPlanningDoc(task.projectId, planningDoc);
});
```

## Progress Tracking

```javascript
// Report progress during task execution
agent.reportProgress(taskId, 25);  // 25% complete

// Report with metadata
agent.reportProgress(taskId, 50, {
  stage: 'testing',
  message: 'Running integration tests',
});
```

## Summary Reports

**Required on task/project completion:**

```javascript
// Task completion with summary
await agent.completeTask(taskId, result, {
  outcome: 'success',  // or 'partial', 'cancelled'
  duration: 3600000,   // milliseconds
  notes: 'Detailed summary of what was done',
  deliverables: ['file1.js', 'file2.md'],
  metrics: {
    linesOfCode: 150,
    testCoverage: 85,
  },
  blockersEncountered: ['None'],
  lessonsLearned: ['Use pattern X for better performance'],
});

// Project summary on completion
await agent.submitProjectSummary('project-id', {
  overview: 'Project achieved goals X, Y, Z',
  outcomes: {
    goalsMet: 3,
    goalsPartial: 1,
    goalsMissed: 0,
  },
  timeline: {
    plannedDuration: '2 weeks',
    actualDuration: '2.5 weeks',
  },
  budget: {
    allocated: 10000,
    spent: 9500,
  },
  deliverables: ['Feature A', 'Feature B', 'Documentation'],
  risks: {
    identified: 5,
    mitigated: 4,
    realized: 1,
  },
  lessonsLearned: [
    'Lesson 1: Do X instead of Y',
    'Lesson 2: Start testing earlier',
  ],
  recommendations: [
    'Consider refactoring Z',
    'Add monitoring for metric W',
  ],
});
```

## API

### `connect()`
Connects to Mission Control via WebSocket (falls back to SSE).

### `onTask(callback)`
Register handler for task assignments.

### `onKill(callback)`
Register handler for kill switch.

### `onPlanningRequired(callback)`
Register handler for tasks requiring planning documents.

### `claimTask(taskId)`
Manually claim a specific task.

### `reportProgress(taskId, percent, metadata?)`
Report task progress (0-100).

### `completeTask(taskId, result, summaryReport?)`
Mark task complete with optional summary report.

### `failTask(taskId, error, summaryReport?)`
Mark task failed with error and optional summary.

### `submitPlanningDoc(projectId, planningDoc)`
Submit planning document for project.

### `submitProjectSummary(projectId, summaryReport)`
Submit summary report for completed project.

### `disconnect()`
Clean disconnect from Mission Control.

## Database Storage

**All data lives in the database:**

- ✅ Agent registration & API keys
- ✅ Task assignments & status
- ✅ Planning documents (JSON in Project table)
- ✅ Summary reports (JSON in Task/Project tables)
- ✅ Progress checkpoints
- ✅ Heartbeat history
- ✅ Audit logs

## Download

From Dashboard → Agents → "Download Agent SDK"

Or direct download:
- SDK: `/agent-sdk/mission-control-agent.js`
- Docs: `/agent-sdk/README.md`

## License

MIT - Part of Mission Control project
