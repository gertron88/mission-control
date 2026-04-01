/**
 * Mission Control Agent Client SDK
 * WebSocket-based agent for Mission Control dashboard
 * @version 1.0.0
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
      ...config
    };
    
    this.socket = null;
    this.connected = false;
    this.currentTask = null;
    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

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

      this.socket.on('connect', () => {
        console.log('[MissionControl] Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[MissionControl] Disconnected:', reason);
        this.connected = false;
        this.stopHeartbeat();
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[MissionControl] Connection error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
        
        this.emit('error', error);
      });

      // Handle task assignment
      this.socket.on('task:assign', (task) => {
        console.log('[MissionControl] Task assigned:', task.id);
        this.currentTask = task;
        this.emit('task', task);
      });

      // Handle kill switch
      this.socket.on('kill', () => {
        console.log('[MissionControl] Kill switch activated!');
        this.emit('kill');
        this.disconnect();
        process.exit(0);
      });

      // Handle ping (keepalive)
      this.socket.on('ping', () => {
        this.socket.emit('pong');
      });
    });
  }

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

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) return;
      
      const heartbeat = {
        timestamp: new Date().toISOString(),
        status: this.currentTask ? 'BUSY' : 'ONLINE',
        cpuUsage: this.getCPUUsage(),
        memoryUsage: this.getMemoryUsage(),
        activeTaskCount: this.currentTask ? 1 : 0,
        metadata: {
          currentTaskId: this.currentTask?.id || null,
          capabilities: this.config.capabilities,
        }
      };

      this.socket.emit('heartbeat', heartbeat);
      this.emit('heartbeat', heartbeat);
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getCPUUsage() {
    // Placeholder - in production, use os.loadavg() or similar
    return Math.floor(Math.random() * 50) + 10;
  }

  getMemoryUsage() {
    // Placeholder - in production, use process.memoryUsage()
    const usage = process.memoryUsage?.();
    return usage ? Math.floor(usage.heapUsed / 1024 / 1024) : 256;
  }

  onTask(callback) {
    this.on('task', callback);
  }

  onKill(callback) {
    this.on('kill', callback);
  }

  reportProgress(taskId, percent, metadata = {}) {
    if (!this.connected) {
      console.warn('[MissionControl] Not connected, cannot report progress');
      return;
    }

    this.socket.emit('task:progress', {
      taskId,
      percent: Math.min(100, Math.max(0, percent)),
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  completeTask(taskId, result) {
    if (!this.connected) {
      throw new Error('Not connected to Mission Control');
    }

    this.socket.emit('task:complete', {
      taskId,
      result,
      timestamp: new Date().toISOString(),
    });

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }

    this.emit('task:completed', { taskId, result });
  }

  failTask(taskId, error) {
    if (!this.connected) {
      throw new Error('Not connected to Mission Control');
    }

    this.socket.emit('task:failed', {
      taskId,
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
    });

    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }

    this.emit('task:failed', { taskId, error });
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
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
