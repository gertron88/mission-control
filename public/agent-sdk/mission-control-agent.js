/**
 * Mission Control Agent Client SDK v3.0
 * WebSocket/SSE-based agent with built-in git coordination
 * Features: Task management, progress tracking, planning docs, summary reports,
 *           git-based coordination, triggers, polling, handoffs
 * @version 3.0.0
 */

const { io } = require('socket.io-client');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class MissionControlAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      missionControlUrl: config.missionControlUrl || process.env.MISSION_CONTROL_URL,
      apiKey: config.apiKey || process.env.MISSION_CONTROL_API_KEY,
      agentId: config.agentId || null,
      handle: config.handle || process.env.AGENT_NAME || `agent-${Date.now()}`,
      name: config.name || process.env.AGENT_NAME || 'Unnamed Agent',
      role: config.role || 'General Purpose',
      capabilities: config.capabilities || [],
      model: config.model || 'default',
      heartbeatInterval: config.heartbeatInterval || 30000,
      pollInterval: config.pollInterval || 30000,
      useWebSocket: config.useWebSocket !== false,
      // Git coordination settings
      sharedWorkspace: config.sharedWorkspace || process.env.SHARED_WORKSPACE || '/opt/shared-workspace',
      enableGitCoordination: config.enableGitCoordination !== false,
      ...config
    };
    
    this.socket = null;
    this.eventSource = null;
    this.connected = false;
    this.currentTask = null;
    this.taskQueue = [];
    this.heartbeatTimer = null;
    this.pollTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isPolling = false;
    this.gitPollTimer = null;
  }

  /**
   * Initialize agent - setup workspace and connect
   */
  async initialize() {
    if (this.config.enableGitCoordination) {
      await this._setupWorkspace();
    }
    return this.connect();
  }

  /**
   * Setup shared workspace structure
   */
  async _setupWorkspace() {
    const workspace = this.config.sharedWorkspace;
    const agentDir = path.join(workspace, 'agents', this.config.handle);
    
    // Create agent-specific directory
    fs.mkdirSync(agentDir, { recursive: true });
    
    // Write agent capabilities
    fs.writeFileSync(
      path.join(agentDir, 'capabilities.json'),
      JSON.stringify({
        handle: this.config.handle,
        name: this.config.name,
        role: this.config.role,
        capabilities: this.config.capabilities,
        model: this.config.model,
        initializedAt: new Date().toISOString()
      }, null, 2)
    );
    
    console.log('[Agent] Workspace initialized:', workspace);
  }

  /**
   * Connect to Mission Control
   */
  async connect() {
    if (!this.config.missionControlUrl) {
      throw new Error('missionControlUrl is required');
    }
    if (!this.config.apiKey) {
      throw new Error('apiKey is required');
    }

    // Register agent if no agentId provided
    if (!this.config.agentId) {
      await this.register();
    }

    // Sync workspace before connecting
    if (this.config.enableGitCoordination) {
      await this.syncWorkspace();
    }

    if (this.config.useWebSocket) {
      return this.connectWebSocket();
    } else {
      return this.connectSSE();
    }
  }

  /**
   * Sync git workspace (pull latest)
   */
  async syncWorkspace() {
    try {
      const { execSync } = require('child_process');
      execSync('git pull', { 
        cwd: this.config.sharedWorkspace,
        stdio: 'pipe'
      });
      console.log('[Agent] Workspace synced');
    } catch (err) {
      console.warn('[Agent] Git sync warning:', err.message);
    }
  }

  /**
   * Connect via WebSocket
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.missionControlUrl, {
        path: '/api/socket',
        auth: {
          apiKey: this.config.apiKey,
          agentId: this.config.agentId,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      const socket = this.socket;

      socket.on('connect', () => {
        console.log('[MissionControl] WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.isPolling = false;
        this.startHeartbeat();
        this._startGitPolling();
        this.emit('connected');
        resolve();
      });

      socket.on('disconnect', (reason) => {
        console.log('[MissionControl] WebSocket disconnected:', reason);
        this.connected = false;
        this.stopHeartbeat();
        this._stopGitPolling();
        this.emit('disconnected', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('[MissionControl] WebSocket error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('[MissionControl] Falling back to polling mode');
          this.socket = null;
          this.connectSSE().then(resolve).catch(reject);
          return;
        }
        
        this.emit('error', error);
      });

      socket.on('task:assign', (task) => {
        console.log('[MissionControl] Task assigned:', task.id);
        this.handleTaskAssigned(task);
      });

      socket.on('kill', () => {
        console.log('[MissionControl] Kill switch activated!');
        this.emit('kill');
        this.disconnect();
        process.exit(0);
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Connect via Server-Sent Events (polling fallback)
   */
  connectSSE() {
    return new Promise((resolve, reject) => {
      this.isPolling = true;
      
      const url = `${this.config.missionControlUrl}/api/events?agentId=${this.config.agentId}&apiKey=${this.config.apiKey}`;
      
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('[MissionControl] SSE connected (polling mode)');
        this.connected = true;
        this.isPolling = true;
        this.startPolling();
        this.startHeartbeat();
        this._startGitPolling();
        this.emit('connected');
        resolve();
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'task:assign') {
            this.handleTaskAssigned(data.task);
          } else if (data.type === 'kill') {
            this.emit('kill');
            this.disconnect();
            process.exit(0);
          }
        } catch (err) {
          console.error('[MissionControl] Failed to parse SSE message:', err);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('[MissionControl] SSE error:', error);
        this.emit('error', error);
        reject(error);
      };
    });
  }

  /**
   * Register new agent
   */
  async register() {
    console.log('[MissionControl] Registering agent...');
    
    const response = await fetch(`${this.config.missionControlUrl}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        handle: this.config.handle,
        name: this.config.name,
        role: this.config.role,
        capabilities: this.config.capabilities,
        model: this.config.model,
      })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const agent = await response.json();
    this.config.agentId = agent.id;
    console.log('[MissionControl] Registered as:', agent.id);
    
    return agent;
  }

  /**
   * Handle task assignment
   */
  async handleTaskAssigned(task) {
    // Check if task has planning doc requirement
    if (task.requiresPlanningDoc && !task.planningDoc) {
      console.log('[MissionControl] Task requires planning doc, cannot start:', task.id);
      this.emit('task:planning_required', task);
      return;
    }
    
    this.currentTask = {
      ...task,
      startedAt: new Date().toISOString(),
      progress: 0,
      checkpoints: [],
    };
    
    // Save to local state
    this._saveCurrentTask();
    
    // Create trigger for other agents
    if (this.config.enableGitCoordination) {
      await this.createTrigger(task.projectId, 'task-started', `Task ${task.id} started by ${this.config.handle}`);
    }
    
    this.emit('task', task);
  }

  /**
   * Save current task to disk
   */
  _saveCurrentTask() {
    const taskPath = path.join(
      this.config.sharedWorkspace,
      'agents',
      this.config.handle,
      'current-task.json'
    );
    fs.writeFileSync(taskPath, JSON.stringify(this.currentTask, null, 2));
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) return;
      
      const heartbeat = {
        timestamp: new Date().toISOString(),
        status: this.currentTask ? 'BUSY' : 'ONLINE',
        cpuUsage: this.getCPUUsage(),
        memoryUsage: this.getMemoryUsage(),
        activeTaskCount: this.currentTask ? 1 : 0,
        currentTaskId: this.currentTask?.id || null,
        metadata: {
          capabilities: this.config.capabilities,
          progress: this.currentTask?.progress || 0,
          role: this.config.role,
        }
      };

      if (this.socket) {
        this.socket.emit('heartbeat', heartbeat);
      } else {
        this.postHeartbeat(heartbeat);
      }
      
      this.emit('heartbeat', heartbeat);
    }, this.config.heartbeatInterval);
  }

  /**
   * Start git polling for coordination updates
   */
  _startGitPolling() {
    if (!this.config.enableGitCoordination) return;
    
    this.gitPollTimer = setInterval(async () => {
      await this.checkForCoordinationUpdates();
    }, 60000); // Check every minute
  }

  /**
   * Check for coordination updates from other agents
   */
  async checkForCoordinationUpdates() {
    try {
      const { execSync } = require('child_process');
      
      // Check if behind
      execSync('git fetch origin', { 
        cwd: this.config.sharedWorkspace,
        stdio: 'pipe'
      });
      
      const local = execSync('git rev-parse @', { cwd: this.config.sharedWorkspace }).toString().trim();
      const remote = execSync('git rev-parse @{u}', { cwd: this.config.sharedWorkspace }).toString().trim();
      
      if (local !== remote) {
        console.log('[Agent] Coordination updates available');
        this.emit('coordination:updates_available');
        
        // Auto-pull if not currently working
        if (!this.currentTask) {
          execSync('git pull', { cwd: this.config.sharedWorkspace, stdio: 'pipe' });
          console.log('[Agent] Auto-pulled updates');
          this.emit('coordination:synced');
        }
      }
    } catch (err) {
      // Silently fail - not critical
    }
  }

  /**
   * Create a trigger file for other agents
   */
  async createTrigger(projectId, type, message) {
    if (!this.config.enableGitCoordination) return;
    
    const triggerDir = path.join(
      this.config.sharedWorkspace,
      'projects',
      projectId,
      'triggers',
      type
    );
    
    fs.mkdirSync(triggerDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const triggerFile = path.join(triggerDir, `${timestamp}-${this.config.handle}.json`);
    
    fs.writeFileSync(triggerFile, JSON.stringify({
      agent: this.config.handle,
      timestamp: new Date().toISOString(),
      type,
      message
    }, null, 2));
    
    // Auto-commit trigger
    try {
      const { execSync } = require('child_process');
      execSync('git add .', { cwd: this.config.sharedWorkspace });
      execSync(`git commit -m "${this.config.handle}: trigger - ${type}"`, { 
        cwd: this.config.sharedWorkspace 
      });
      execSync('git push', { cwd: this.config.sharedWorkspace });
    } catch (err) {
      console.warn('[Agent] Failed to push trigger:', err.message);
    }
  }

  /**
   * Create a handoff file for another agent
   */
  async createHandoff(projectId, targetAgent, summary, details = {}) {
    if (!this.config.enableGitCoordination) return;
    
    const handoffDir = path.join(
      this.config.sharedWorkspace,
      'projects',
      projectId,
      'handoffs'
    );
    
    fs.mkdirSync(handoffDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 13);
    const handoffFile = path.join(
      handoffDir,
      `${timestamp}-${this.config.handle}-to-${targetAgent}.md`
    );
    
    const content = `---
from: ${this.config.handle}
to: ${targetAgent}
timestamp: ${new Date().toISOString()}
project: ${projectId}
---

## Summary
${summary}

## Context
${details.context || 'N/A'}

## Files Changed
${(details.files || []).map(f => `- ${f}`).join('\n') || '- N/A'}

## Blockers
${details.blockers || 'None'}

## Questions
${details.questions || 'None'}
`;
    
    fs.writeFileSync(handoffFile, content);
    
    // Commit handoff
    try {
      const { execSync } = require('child_process');
      execSync('git add .', { cwd: this.config.sharedWorkspace });
      execSync(`git commit -m "${this.config.handle}: handoff to ${targetAgent}"`, {
        cwd: this.config.sharedWorkspace
      });
      execSync('git push', { cwd: this.config.sharedWorkspace });
      console.log('[Agent] Handoff created:', handoffFile);
    } catch (err) {
      console.warn('[Agent] Failed to push handoff:', err.message);
    }
    
    return handoffFile;
  }

  /**
   * Update project status file
   */
  async updateProjectStatus(projectId, updates) {
    if (!this.config.enableGitCoordination) return;
    
    const statusPath = path.join(
      this.config.sharedWorkspace,
      'projects',
      projectId,
      'STATUS.md'
    );
    
    let content = '';
    if (fs.existsSync(statusPath)) {
      content = fs.readFileSync(statusPath, 'utf8');
    }
    
    // Append update
    const updateEntry = `
## ${new Date().toISOString()} - ${this.config.handle}
${updates}
`;
    
    fs.writeFileSync(statusPath, content + updateEntry);
    
    // Commit
    try {
      const { execSync } = require('child_process');
      execSync('git add .', { cwd: this.config.sharedWorkspace });
      execSync(`git commit -m "${this.config.handle}: update status"`, {
        cwd: this.config.sharedWorkspace
      });
      execSync('git push', { cwd: this.config.sharedWorkspace });
    } catch (err) {
      console.warn('[Agent] Failed to push status:', err.message);
    }
  }

  /**
   * Post heartbeat via HTTP
   */
  async postHeartbeat(heartbeat) {
    try {
      await fetch(`${this.config.missionControlUrl}/api/agents/${this.config.agentId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(heartbeat)
      });
    } catch (err) {
      console.error('[MissionControl] Failed to post heartbeat:', err.message);
    }
  }

  /**
   * Start polling for tasks
   */
  startPolling() {
    this.pollTimer = setInterval(async () => {
      if (!this.connected || this.currentTask) return;
      
      try {
        const response = await fetch(
          `${this.config.missionControlUrl}/api/tasks?status=READY&assignee=null`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            }
          }
        );
        
        if (!response.ok) return;
        
        const tasks = await response.json();
        
        const matchingTask = tasks.find(task => 
          this.canHandleTask(task)
        );
        
        if (matchingTask) {
          await this.claimTask(matchingTask.id);
        }
      } catch (err) {
        console.error('[MissionControl] Polling error:', err.message);
      }
    }, this.config.pollInterval);
  }

  /**
   * Check if agent can handle a task
   */
  canHandleTask(task) {
    if (!task.requiredCapabilities) return true;
    return task.requiredCapabilities.every(cap => 
      this.config.capabilities.includes(cap)
    );
  }

  /**
   * Claim a task
   */
  async claimTask(taskId) {
    console.log('[MissionControl] Claiming task:', taskId);
    
    try {
      const response = await fetch(
        `${this.config.missionControlUrl}/api/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            assigneeId: this.config.agentId,
            status: 'ASSIGNED',
            assignedAt: new Date().toISOString(),
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to claim task: ${response.statusText}`);
      }
      
      const task = await response.json();
      
      if (task.requiresPlanningDoc && !task.planningDoc) {
        console.log('[MissionControl] Task requires planning doc');
        this.emit('task:planning_required', task);
        return;
      }
      
      this.handleTaskAssigned(task);
      
    } catch (err) {
      console.error('[MissionControl] Failed to claim task:', err.message);
    }
  }

  /**
   * Report task progress
   */
  reportProgress(taskId, percent, metadata = {}) {
    if (!this.connected) {
      console.warn('[MissionControl] Not connected, cannot report progress');
      return;
    }

    const progress = Math.min(100, Math.max(0, percent));
    
    if (this.currentTask) {
      this.currentTask.progress = progress;
      this.currentTask.checkpoints.push({
        percent,
        timestamp: new Date().toISOString(),
        ...metadata
      });
      this._saveCurrentTask();
    }

    const data = {
      taskId,
      percent: progress,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (this.socket) {
      this.socket.emit('task:progress', data);
    } else {
      this.postProgress(data);
    }
    
    this.emit('task:progress', data);
  }

  /**
   * Post progress via HTTP
   */
  async postProgress(data) {
    try {
      await fetch(`${this.config.missionControlUrl}/api/tasks/${data.taskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error('[MissionControl] Failed to post progress:', err.message);
    }
  }

  /**
   * Complete task with summary report
   */
  async completeTask(taskId, result, summaryReport = null) {
    if (!this.connected) {
      throw new Error('Not connected to Mission Control');
    }

    const data = {
      taskId,
      result,
      summaryReport: summaryReport || {
        completedAt: new Date().toISOString(),
        duration: this.currentTask ? 
          Date.now() - new Date(this.currentTask.startedAt).getTime() : null,
        outcome: 'success',
        notes: 'Task completed successfully',
        completedBy: this.config.handle,
        role: this.config.role,
      },
      timestamp: new Date().toISOString(),
    };

    if (this.socket) {
      this.socket.emit('task:complete', data);
    } else {
      await fetch(`${this.config.missionControlUrl}/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data)
      });
    }

    // Create completion trigger
    if (this.config.enableGitCoordination) {
      await this.createTrigger(
        this.currentTask?.projectId || 'unknown',
        'task-completed',
        `Task ${taskId} completed by ${this.config.handle}`
      );
    }

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
      this._clearCurrentTask();
    }

    this.emit('task:completed', { taskId, result, summaryReport });
  }

  /**
   * Fail task with error and summary
   */
  async failTask(taskId, error, summaryReport = null) {
    if (!this.connected) {
      throw new Error('Not connected to Mission Control');
    }

    const data = {
      taskId,
      error: error.message || String(error),
      summaryReport: summaryReport || {
        completedAt: new Date().toISOString(),
        duration: this.currentTask ? 
          Date.now() - new Date(this.currentTask.startedAt).getTime() : null,
        outcome: 'failed',
        error: error.message || String(error),
        notes: 'Task failed - see error details',
        failedBy: this.config.handle,
        role: this.config.role,
      },
      retryable: error.retryable !== false,
      timestamp: new Date().toISOString(),
    };

    if (this.socket) {
      this.socket.emit('task:failed', data);
    } else {
      await fetch(`${this.config.missionControlUrl}/api/tasks/${taskId}/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data)
      });
    }

    // Create failure trigger
    if (this.config.enableGitCoordination) {
      await this.createTrigger(
        this.currentTask?.projectId || 'unknown',
        'blocked',
        `Task ${taskId} failed: ${error.message}`
      );
    }

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
      this._clearCurrentTask();
    }

    this.emit('task:failed', { taskId, error, summaryReport });
  }

  /**
   * Clear current task file
   */
  _clearCurrentTask() {
    try {
      const taskPath = path.join(
        this.config.sharedWorkspace,
        'agents',
        this.config.handle,
        'current-task.json'
      );
      if (fs.existsSync(taskPath)) {
        fs.unlinkSync(taskPath);
      }
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Submit planning document for a project
   */
  async submitPlanningDoc(projectId, planningDoc) {
    console.log('[MissionControl] Submitting planning doc for project:', projectId);
    
    try {
      const response = await fetch(
        `${this.config.missionControlUrl}/api/projects/${projectId}/planning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            planningDoc: {
              ...planningDoc,
              submittedAt: new Date().toISOString(),
              submittedBy: this.config.agentId,
            },
            status: 'PENDING_APPROVAL'
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to submit planning doc: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Save to git
      if (this.config.enableGitCoordination) {
        const planPath = path.join(
          this.config.sharedWorkspace,
          'projects',
          projectId,
          'planning',
          `${new Date().toISOString().split('T')[0]}-plan.md`
        );
        fs.mkdirSync(path.dirname(planPath), { recursive: true });
        fs.writeFileSync(planPath, typeof planningDoc === 'string' ? planningDoc : JSON.stringify(planningDoc, null, 2));
      }
      
      this.emit('planning:submitted', { projectId, planningDoc: result });
      return result;
      
    } catch (err) {
      console.error('[MissionControl] Failed to submit planning doc:', err.message);
      throw err;
    }
  }

  /**
   * Submit summary report for a project
   */
  async submitProjectSummary(projectId, summaryReport) {
    console.log('[MissionControl] Submitting project summary:', projectId);
    
    try {
      const response = await fetch(
        `${this.config.missionControlUrl}/api/projects/${projectId}/summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            summaryReport: {
              ...summaryReport,
              submittedAt: new Date().toISOString(),
              submittedBy: this.config.agentId,
            },
            status: 'COMPLETED'
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to submit project summary: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Save to git
      if (this.config.enableGitCoordination) {
        const summaryPath = path.join(
          this.config.sharedWorkspace,
          'projects',
          projectId,
          'summaries',
          `${new Date().toISOString().split('T')[0]}-summary.md`
        );
        fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
        fs.writeFileSync(summaryPath, typeof summaryReport === 'string' ? summaryReport : JSON.stringify(summaryReport, null, 2));
      }
      
      this.emit('project:summary_submitted', { projectId, summaryReport: result });
      return result;
      
    } catch (err) {
      console.error('[MissionControl] Failed to submit project summary:', err.message);
      throw err;
    }
  }

  // Utility methods
  getCPUUsage() {
    return Math.floor(Math.random() * 50) + 10;
  }

  getMemoryUsage() {
    const usage = process.memoryUsage?.();
    return usage ? Math.floor(usage.heapUsed / 1024 / 1024) : 256;
  }

  onTask(callback) {
    this.on('task', callback);
  }

  onKill(callback) {
    this.on('kill', callback);
  }

  onPlanningRequired(callback) {
    this.on('task:planning_required', callback);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _stopGitPolling() {
    if (this.gitPollTimer) {
      clearInterval(this.gitPollTimer);
      this.gitPollTimer = null;
    }
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.stopPolling();
    this._stopGitPolling();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.connected = false;
    console.log('[MissionControl] Disconnected');
  }
}

// Export for CommonJS
module.exports = { MissionControlAgent };

// Export for ES modules
if (typeof exports !== 'undefined') {
  exports.MissionControlAgent = MissionControlAgent;
}
