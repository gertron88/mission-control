# Mission Control Agent SDK

Node.js SDK for AI agents to connect to Mission Control.

## Installation

```bash
npm install @mission-control/sdk
```

## Quick Start

```typescript
import { MissionControlAgent } from '@mission-control/sdk'

const agent = new MissionControlAgent({
  baseUrl: 'https://mission-control-yourname.vercel.app',
  apiKey: 'your-agent-api-key',
  agentId: 'your-agent-id',
  handle: '@claw-trader'
})

// Connect and start heartbeat
await agent.connect()

// Poll for tasks
agent.onTask(async (task) => {
  console.log('Received task:', task.title)
  
  // Update status to running
  await agent.updateTask(task.id, { status: 'RUNNING' })
  
  // Do the work...
  
  // Mark complete
  await agent.updateTask(task.id, { 
    status: 'COMPLETE',
    actualOutputs: { result: 'success' }
  })
})
```

## Configuration

```typescript
interface AgentConfig {
  baseUrl: string        // Mission Control URL
  apiKey: string         // Agent API key
  agentId: string        // Agent ID from Mission Control
  handle: string         // Agent handle (@claw-trader)
  
  // Optional
  heartbeatInterval?: number  // ms (default: 30000)
  pollInterval?: number       // ms (default: 60000)
  capabilities?: string[]     // Agent capabilities
}
```

## API Reference

### Agent Methods

#### `connect()`
Start heartbeat and task polling.

```typescript
await agent.connect()
```

#### `disconnect()`
Stop all intervals and mark agent offline.

```typescript
await agent.disconnect()
```

#### `sendHeartbeat(status, metadata)`
Manually send a heartbeat.

```typescript
await agent.sendHeartbeat('BUSY', {
  cpuUsage: 45,
  memoryUsage: 512,
  activeTaskCount: 2
})
```

#### `getTasks(filter)`
Get tasks assigned to this agent.

```typescript
const tasks = await agent.getTasks({
  status: 'READY'
})
```

#### `updateTask(taskId, updates)`
Update a task's status or properties.

```typescript
await agent.updateTask('task-123', {
  status: 'COMPLETE',
  actualEffort: 4.5
})
```

#### `createTask(taskData)`
Create a new task.

```typescript
await agent.createTask({
  title: 'Implement feature',
  description: 'Build the thing',
  type: 'FEATURE',
  priority: 'HIGH',
  projectId: 'project-123'
})
```

#### `reportBlocker(taskId, type, reason)`
Report that a task is blocked.

```typescript
await agent.reportBlocker('task-123', 
  'MISSING_CREDENTIALS',
  'Need API key for Binance'
)
```

#### `logActivity(type, description, metadata)`
Log an activity to Mission Control.

```typescript
await agent.logActivity('CODE_PUSHED', 
  'Pushed fix for rate limiting',
  { commit: 'abc123', branch: 'main' }
)
```

### Event Handlers

#### `onTask(handler)`
Called when a new task is assigned.

```typescript
agent.onTask(async (task) => {
  // Handle the task
})
```

#### `onKillSwitch(handler)`
Called when kill switch is activated.

```typescript
agent.onKillSwitch(() => {
  // Stop all trading immediately
  tradingEngine.stop()
})
```

## Example: Trading Bot Agent

```typescript
import { MissionControlAgent } from '@mission-control/sdk'
import { TradingEngine } from './trading-engine'

const tradingAgent = new MissionControlAgent({
  baseUrl: process.env.MISSION_CONTROL_URL,
  apiKey: process.env.AGENT_API_KEY,
  agentId: process.env.AGENT_ID,
  handle: '@claw-trader',
  capabilities: ['strategy_dev', 'execution', 'risk_management']
})

const engine = new TradingEngine()

// Handle trading tasks
tradingAgent.onTask(async (task) => {
  if (task.type === 'TRADING_STRATEGY') {
    await tradingAgent.updateTask(task.id, { status: 'RUNNING' })
    
    try {
      // Execute trading logic
      const result = await engine.executeStrategy(task)
      
      await tradingAgent.updateTask(task.id, {
        status: 'COMPLETE',
        actualOutputs: result
      })
    } catch (error) {
      await tradingAgent.updateTask(task.id, {
        status: 'FAILED',
        metadata: { error: error.message }
      })
    }
  }
})

// Handle emergency stops
tradingAgent.onKillSwitch(() => {
  console.log('🚨 Kill switch activated! Stopping all trades...')
  engine.emergencyStop()
})

// Connect and start
await tradingAgent.connect()
```

## Error Handling

```typescript
agent.onError((error) => {
  console.error('Agent SDK error:', error)
})

// All methods throw on failure
try {
  await agent.updateTask('task-123', { status: 'COMPLETE' })
} catch (error) {
  console.error('Failed to update task:', error.message)
}
```

## License

MIT
