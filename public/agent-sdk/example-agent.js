#!/usr/bin/env node
/**
 * Example Agent - Mission Control SDK v3.0
 * 
 * This is a complete example agent that connects to Mission Control
 * and participates in coordinated multi-agent workflows.
 * 
 * Usage:
 *   export MISSION_CONTROL_URL="..."
 *   export MISSION_CONTROL_API_KEY="..."
 *   export AGENT_NAME="agent-1"
 *   export AGENT_ROLE="Backend Developer"
 *   export SHARED_WORKSPACE="/opt/shared-workspace"
 *   node example-agent.js
 */

const { MissionControlAgent } = require('./mission-control-agent.js');
const fs = require('fs');
const path = require('path');

// Agent configuration from environment
const config = {
  missionControlUrl: process.env.MISSION_CONTROL_URL,
  apiKey: process.env.MISSION_CONTROL_API_KEY,
  handle: process.env.AGENT_NAME,
  name: process.env.AGENT_NAME,
  role: process.env.AGENT_ROLE || 'General Purpose',
  capabilities: (process.env.AGENT_CAPABILITIES || '').split(',').filter(Boolean),
  model: process.env.AGENT_MODEL || 'default',
  sharedWorkspace: process.env.SHARED_WORKSPACE || '/opt/shared-workspace',
  enableGitCoordination: true
};

// Validate config
if (!config.missionControlUrl || !config.apiKey || !config.handle) {
  console.error('Missing required environment variables:');
  console.error('  MISSION_CONTROL_URL, MISSION_CONTROL_API_KEY, AGENT_NAME');
  process.exit(1);
}

// Create agent
const agent = new MissionControlAgent(config);

// Log agent identity
console.log('='.repeat(50));
console.log(`Agent: ${config.handle}`);
console.log(`Role: ${config.role}`);
console.log(`Capabilities: ${config.capabilities.join(', ') || 'none'}`);
console.log(`Workspace: ${config.sharedWorkspace}`);
console.log('='.repeat(50));

// Handle task assignment
agent.onTask(async (task) => {
  console.log(`\n[${config.handle}] 🎯 Task assigned: ${task.title}`);
  console.log(`  ID: ${task.id}`);
  console.log(`  Project: ${task.projectId}`);
  console.log(`  Priority: ${task.priority || 'normal'}`);
  
  try {
    // 1. Check for handoffs from other agents
    await checkHandoffs(task.projectId);
    
    // 2. Update shared status
    await agent.updateProjectStatus(
      task.projectId,
      `## ${new Date().toISOString()} - ${config.handle}\n` +
      `- Task ${task.id} started: ${task.title}\n`
    );
    
    // 3. Execute task (placeholder - implement your logic)
    const result = await executeTask(task);
    
    // 4. Report completion
    await agent.completeTask(task.id, result, {
      outcome: 'success',
      notes: `Completed by ${config.role} (${config.handle})`,
      completedBy: config.handle,
      role: config.role,
      duration: result.duration,
      artifacts: result.artifacts || []
    });
    
    // 5. Create trigger for other agents
    await agent.createTrigger(
      task.projectId,
      'task-completed',
      `Task "${task.title}" completed by ${config.handle}`
    );
    
    console.log(`[${config.handle}] ✅ Task completed: ${task.id}\n`);
    
  } catch (error) {
    console.error(`[${config.handle}] ❌ Task failed:`, error.message);
    
    await agent.failTask(task.id, error, {
      outcome: 'failed',
      error: error.message,
      failedBy: config.handle,
      role: config.role
    });
    
    await agent.createTrigger(
      task.projectId,
      'blocked',
      `Task ${task.id} failed: ${error.message}`
    );
  }
});

// Handle coordination events
agent.on('connected', () => {
  console.log(`[${config.handle}] 🔌 Connected to Mission Control`);
});

agent.on('disconnected', (reason) => {
  console.log(`[${config.handle}] 🔌 Disconnected:`, reason);
});

agent.on('coordination:updates_available', () => {
  console.log(`[${config.handle}] 📥 Updates from team available`);
});

agent.on('coordination:synced', () => {
  console.log(`[${config.handle}] 📥 Workspace synced with team`);
});

agent.on('kill', () => {
  console.log(`[${config.handle}] ☠️  Kill switch activated`);
  process.exit(0);
});

// Check for handoffs from other agents
async function checkHandoffs(projectId) {
  const handoffDir = path.join(
    config.sharedWorkspace,
    'projects',
    projectId,
    'handoffs'
  );
  
  if (!fs.existsSync(handoffDir)) return;
  
  const handoffs = fs.readdirSync(handoffDir)
    .filter(f => f.includes(`to-${config.handle}`))
    .sort()
    .reverse(); // Most recent first
  
  if (handoffs.length > 0) {
    console.log(`[${config.handle}] 📋 Found ${handoffs.length} handoff(s):`);
    
    for (const handoff of handoffs.slice(0, 3)) { // Show last 3
      const content = fs.readFileSync(
        path.join(handoffDir, handoff),
        'utf8'
      );
      
      // Parse frontmatter
      const match = content.match(/from:\s*(.+)/);
      const from = match ? match[1].trim() : 'unknown';
      
      console.log(`  - From ${from}: ${handoff}`);
      console.log(`    Preview: ${content.split('\n').slice(10, 14).join(' ').substring(0, 80)}...`);
    }
  }
}

// Execute task (placeholder - implement your actual logic)
async function executeTask(task) {
  console.log(`[${config.handle}] 🏃 Executing task...`);
  
  // Simulate work with progress updates
  const phases = ['analyzing', 'planning', 'implementing', 'testing'];
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const progress = Math.round(((i + 1) / phases.length) * 100);
    
    console.log(`[${config.handle}]   → ${phase}... (${progress}%)`);
    
    // Report progress to Mission Control
    agent.reportProgress(task.id, progress, { phase });
    
    // Simulate work time
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return {
    success: true,
    duration: phases.length * 1000,
    artifacts: [`output-${task.id}.json`],
    output: `Task ${task.id} completed by ${config.role}`
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n[${config.handle}] 👋 Shutting down...`);
  agent.disconnect();
  process.exit(0);
});

// Start agent
(async () => {
  try {
    await agent.initialize();
    console.log(`[${config.handle}] ✅ Ready and waiting for tasks...`);
    console.log(`[${config.handle}] Press Ctrl+C to exit\n`);
  } catch (error) {
    console.error(`[${config.handle}] ❌ Failed to start:`, error.message);
    process.exit(1);
  }
})();
