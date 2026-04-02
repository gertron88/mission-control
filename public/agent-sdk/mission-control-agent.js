/**
 * Mission Control Agent Client SDK v2.0
 * WebSocket/SSE-based agent for Mission Control dashboard
 * Features: Task claiming, progress tracking, planning docs, summary reports
 * @version 2.0.0
 */

const { io } = require('socket.io-client');
const EventEmitter = require('events');

class MissionControlAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      missionControlUrl: config.missionControlUrl || process.env.MISSION_CONTROL_URL,
      apiKey: config.apiKey || process.env.MISSION_CONTROL_API_KEY,
      agentId: config.agentId || null,
      heartbeatInterval: config.heartbeatInterval || 30000,
      capabilities: config.capabilities || [],
      pollInterval: config.pollInterval || 30000, // For polling mode
      useWebSocket: config.useWebSocket !== false, // Default to WebSocket
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

    if (this.config.useWebSocket) {
      return this.connectWebSocket();
    } else {
      return this.connectSSE();
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
        this.emit('connected');
        resolve();
      });

      socket.on('disconnect', (reason) => {
        console.log('[MissionControl] WebSocket disconnected:', reason);
        this.connected = false;
        this.stopHeartbeat();
        this.emit('disconnected', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('[MissionControl] WebSocket error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          // Fall back to polling
          console.log('[MissionControl] Falling back to polling mode');
          this.socket = null;
          this.connectSSE().then(resolve).catch(reject);
          return;
        }
        
        this.emit('error', error);
      });

      // Handle task assignment
      socket.on('task:assign', (task) => {
        console.log('[MissionControl] Task assigned:', task.id);
        this.handleTaskAssigned(task);
      });

      // Handle kill switch
      socket.on('kill', () => {
        console.log('[MissionControl] Kill switch activated!');
        this.emit('kill');
        this.disconnect();
        process.exit(0);
      });

      // Handle ping (keepalive)
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
        handle: this.config.handle || `agent-${Date.now()}`,
        name: this.config.name || 'Unnamed Agent',
        role: this.config.role || 'General Purpose',
        capabilities: this.config.capabilities,
        model: this.config.model || 'default',
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
  handleTaskAssigned(task) {
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
    
    this.emit('task', task);
  }

  /**
   * Start heartbeat (every 30s)
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
        }
      };

      if (this.socket) {
        this.socket.emit('heartbeat', heartbeat);
      } else {
        // POST heartbeat for polling mode
        this.postHeartbeat(heartbeat);
      }
      
      this.emit('heartbeat', heartbeat);
    }, this.config.heartbeatInterval);
  }

  /**
   * Post heartbeat via HTTP (polling mode)
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
   * Start polling for tasks (SSE mode)
   */
  startPolling() {
    this.pollTimer = setInterval(async () => {
      if (!this.connected || this.currentTask) return;
      
      try {
        // Check for available tasks
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
        
        // Find matching task by capabilities
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
      
      // Check for planning doc requirement
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

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
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

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }

    this.emit('task:failed', { taskId, error, summaryReport });
  }

  /**
   * Submit planning document for a project or task
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

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.stopPolling();
    
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
