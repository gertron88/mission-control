# Mission Control Agent SDK v3.0

## Overview

The enhanced Agent SDK now includes **built-in git coordination**. Agents connecting to your Mission Control instance automatically get multi-agent collaboration features.

## What's New in v3.0

### Automatic Git Coordination
- Auto-sync workspace on connect
- Auto-pull updates when idle
- Automatic trigger/handoff creation on task events
- Project status file updates

### New Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Setup workspace + connect |
| `createTrigger(projectId, type, message)` | Notify other agents |
| `createHandoff(projectId, targetAgent, summary, details)` | Pass work to specific agent |
| `updateProjectStatus(projectId, updates)` | Update shared STATUS.md |
| `syncWorkspace()` | Manual git pull |

### New Events

| Event | When Fired |
|-------|------------|
| `coordination:updates_available` | Other agents pushed changes |
| `coordination:synced` | Auto-pull completed |

## Quick Start for Agents

### 1. Install SDK

```bash
# Download from your hosted Mission Control
wget https://your-mission-control.vercel.app/agent-sdk/mission-control-agent.js
npm install socket.io-client
```

### 2. Basic Connection

```javascript
const { MissionControlAgent } = require('./mission-control-agent.js');

const agent = new MissionControlAgent({
  missionControlUrl: 'https://your-mission-control.vercel.app',
  apiKey: process.env.MISSION_CONTROL_API_KEY,
  handle: 'agent-1',
  name: 'Developer Agent',
  role: 'Full Stack Developer',
  capabilities: ['typescript', 'react', 'node', 'prisma'],
  sharedWorkspace: '/opt/shared-workspace',
  enableGitCoordination: true
});

// Initialize sets up workspace and connects
await agent.initialize();
```

### 3. Handle Tasks with Coordination

```javascript
agent.onTask(async (task) => {
  console.log(`[${agent.config.handle}] Task assigned:`, task.title);
  
  // 1. Update shared status
  await agent.updateProjectStatus(task.projectId, 
    `- Task ${task.id} in progress by ${agent.config.handle}`
  );
  
  // 2. Do the work...
  const result = await executeTask(task);
  
  // 3. Report progress (automatically saved to git)
  agent.reportProgress(task.id, 50, { phase: 'testing' });
  
  // 4. Complete with summary
  await agent.completeTask(task.id, result, {
    outcome: 'success',
    notes: 'Implemented feature with tests',
    artifacts: ['src/feature.ts', 'tests/feature.test.ts']
  });
  
  // 5. Create trigger for other agents (auto-committed)
  await agent.createTrigger(task.projectId, 'task-completed', 
    `Feature ready for review`
  );
});
```

### 4. Handoff to Another Agent

```javascript
// When you need to pass work
await agent.createHandoff(
  'my-project',
  'agent-2',  // target agent
  'Backend API implemented, needs frontend integration',
  {
    context: 'All endpoints tested and documented',
    files: ['src/api/routes.ts', 'docs/api.md'],
    questions: 'Should we add rate limiting now or later?'
  }
);
```

## Role-Based Task Distribution

Agents declare roles and capabilities. Mission Control assigns tasks accordingly:

```javascript
// Agent 1 - Frontend specialist
const frontendAgent = new MissionControlAgent({
  handle: 'agent-1',
  role: 'Frontend Developer',
  capabilities: ['react', 'typescript', 'tailwind', 'ui-design']
});

// Agent 2 - Backend specialist
const backendAgent = new MissionControlAgent({
  handle: 'agent-2', 
  role: 'Backend Developer',
  capabilities: ['node', 'prisma', 'postgresql', 'api-design']
});

// Agent 3 - DevOps
const devopsAgent = new MissionControlAgent({
  handle: 'agent-3',
  role: 'DevOps Engineer',
  capabilities: ['docker', 'kubernetes', 'ci-cd', 'aws']
});
```

Tasks specify required capabilities:

```javascript
// Task in Mission Control
{
  id: "task-123",
  title: "Build user dashboard",
  requiredCapabilities: ['react', 'typescript'],
  // Only agent-1 can claim this
}
```

## Environment Variables

```bash
# Required
export MISSION_CONTROL_URL="https://your-app.vercel.app"
export MISSION_CONTROL_API_KEY="your-api-key"
export AGENT_NAME="agent-1"

# For git coordination
export SHARED_WORKSPACE="/opt/shared-workspace"

# Optional
export AGENT_CAPABILITIES="typescript,react,node"
export AGENT_ROLE="Developer"
```

## Project Structure (Auto-Created)

```
/opt/shared-workspace/
├── projects/
│   └── my-project/
│       ├── STATUS.md              # Auto-updated
│       ├── handoffs/              # Handoff files auto-created
│       ├── triggers/              # Trigger files auto-created
│       ├── planning/              # Planning docs auto-saved
│       └── summaries/             # Summary reports auto-saved
└── agents/
    └── agent-1/
        ├── capabilities.json      # Auto-written on init
        └── current-task.json      # Auto-updated
```

## How Coordination Works

### Automatic (No Code Required)

1. **On connect** → Workspace synced (git pull)
2. **Task assigned** → Current task saved to disk
3. **Progress reported** → Checkpoints saved to disk
4. **Task completed** → Trigger auto-created and pushed
5. **Idle polling** → Auto-pull every 60s for updates

### Manual (When Needed)

```javascript
// Create handoff to specific agent
await agent.createHandoff(projectId, targetAgent, summary, details);

// Update project status
await agent.updateProjectStatus(projectId, markdownContent);

// Create custom trigger
await agent.createTrigger(projectId, 'blocked', 'Need API credentials');

// Force sync
await agent.syncWorkspace();
```

## Example: 5-Agent Workflow

```javascript
// agents.js - Run on each VPS

const { MissionControlAgent } = require('./mission-control-agent.js');

const agent = new MissionControlAgent({
  missionControlUrl: process.env.MISSION_CONTROL_URL,
  apiKey: process.env.MISSION_CONTROL_API_KEY,
  handle: process.env.AGENT_NAME,
  name: process.env.AGENT_NAME,
  role: process.env.AGENT_ROLE,
  capabilities: process.env.AGENT_CAPABILITIES?.split(',') || [],
  sharedWorkspace: process.env.SHARED_WORKSPACE,
  enableGitCoordination: true
});

agent.onTask(async (task) => {
  console.log(`[${agent.config.handle}] Starting: ${task.title}`);
  
  // Check for handoffs from previous agent
  const handoffs = fs.readdirSync(
    `${process.env.SHARED_WORKSPACE}/projects/${task.projectId}/handoffs`
  ).filter(f => f.includes(`to-${agent.config.handle}`));
  
  if (handoffs.length > 0) {
    console.log(`Found ${handoffs.length} handoff(s) to review`);
    // Read handoff content...
  }
  
  // Execute task based on role
  const result = await executeByRole(task, agent.config.role);
  
  // Complete and notify
  await agent.completeTask(task.id, result, {
    outcome: 'success',
    notes: `Completed by ${agent.config.role}`,
    completedBy: agent.config.handle
  });
});

// Handle coordination events
agent.on('coordination:updates_available', () => {
  console.log('[Agent] Updates from other agents available');
});

agent.on('coordination:synced', () => {
  console.log('[Agent] Workspace synced with team');
});

// Start
await agent.initialize();
console.log(`[${agent.config.handle}] Ready for tasks`);

// Role-based execution
async function executeByRole(task, role) {
  switch (role) {
    case 'Architect':
      return await designSystem(task);
    case 'Backend Developer':
      return await implementAPI(task);
    case 'Frontend Developer':
      return await buildUI(task);
    case 'QA Engineer':
      return await runTests(task);
    case 'DevOps Engineer':
      return await deploy(task);
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}
```

## Troubleshooting

### "Git sync warning"

Git coordination is optional. Agent continues working with Mission Control API only.

### "Failed to push trigger"

Another agent may have pushed changes. Agent will retry on next event.

### Multiple agents claim same task

Mission Control prevents this with atomic claim operations. Only one succeeds.

## Migration from v2.0

```javascript
// Old (v2.0)
const agent = new MissionControlAgent(config);
await agent.connect();

// New (v3.0)
const agent = new MissionControlAgent({
  ...config,
  sharedWorkspace: '/opt/shared-workspace',
  enableGitCoordination: true
});
await agent.initialize(); // Replaces connect(), sets up workspace
```

All v2.0 methods still work. Coordination features are additive.
