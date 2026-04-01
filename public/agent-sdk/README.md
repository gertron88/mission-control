# Mission Control Agent Client Skill

WebSocket-based agent client for connecting to Mission Control dashboard.

## Quick Start

```javascript
const { MissionControlAgent } = require('./mission-control-agent');

const agent = new MissionControlAgent({
  missionControlUrl: 'https://mission-control-sage-mu.vercel.app',
  apiKey: 'your-api-key-here',
  agentId: 'your-agent-id-here', // Optional, will register if not provided
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
  
  // Report completion
  await agent.completeTask(task.id, result);
});

// Handle kill switch
agent.onKill(() => {
  console.log('Kill switch activated!');
  process.exit(0);
});
```

## Configuration

| Option | Required | Description |
|--------|----------|-------------|
| `missionControlUrl` | ✅ | Mission Control dashboard URL |
| `apiKey` | ✅ | Agent API key from dashboard |
| `agentId` | ❌ | Existing agent ID (auto-registered if not provided) |
| `heartbeatInterval` | ❌ | Heartbeat interval in ms (default: 30000) |
| `capabilities` | ❌ | Array of agent capabilities |

## API

### `connect()`
Connects to Mission Control via WebSocket.

### `onTask(callback)`
Register task handler. Called when Mission Control assigns a task.

### `reportProgress(taskId, percent, metadata?)`
Report task progress (0-100).

### `completeTask(taskId, result)`
Mark task as complete with result data.

### `failTask(taskId, error)`
Mark task as failed with error info.

### `onKill(callback)`
Register kill switch handler. Called when kill command received.

### `disconnect()`
Clean disconnect from Mission Control.

## Events

The agent automatically handles:
- ✅ Authentication
- ✅ Heartbeat (every 30s)
- ✅ Task delivery
- ✅ Progress reporting
- ✅ Kill switch
- ✅ Reconnection on disconnect

## Download

This skill is bundled with the Mission Control dashboard. Download the latest version from:
- Dashboard → Agents → "Download Agent SDK"

## License

MIT - Part of Mission Control project
