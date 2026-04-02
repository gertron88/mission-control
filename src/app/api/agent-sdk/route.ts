/**
 * Agent SDK Endpoint
 * 
 * GET /api/agent-sdk - Returns the Agent SDK JavaScript code
 * Agents can curl this endpoint to bootstrap themselves
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const AGENT_SDK_CODE = `'use strict';

/**
 * Mission Control Agent SDK
 * Self-contained agent client for connecting to Mission Control
 * 
 * Usage:
 *   curl https://mission-control.vercel.app/api/agent-sdk | node - --api-key=YOUR_KEY --name=agent-name
 */

const WebSocket = require('ws');
const https = require('https');

class MissionControlAgent {
  constructor(config) {
    this.config = {
      missionControlUrl: config.missionControlUrl || process.env.MISSION_CONTROL_URL,
      apiKey: config.apiKey || process.env.MC_API_KEY,
      name: config.name || 'unnamed-agent',
      role: config.role || 'WORKER',
      capabilities: config.capabilities || [],
      heartbeatInterval: config.heartbeatInterval || 30000,
      ...config
    };
    
    this.ws = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.taskHandlers = new Map();
    this.killHandler = null;
    this.connected = false;
    this.agentId = null;
  }

  /**
   * Connect to Mission Control via WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.missionControlUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      console.log('[Agent SDK] Connecting to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl + '/api/socket', {
        headers: {
          'Authorization': 'Bearer ' + this.config.apiKey
        }
      });

      this.ws.on('open', () => {
        console.log('[Agent SDK] Connected to Mission Control');
        this.connected = true;
        
        // Register agent
        this.send({
          type: 'REGISTER',
          payload: {
            name: this.config.name,
            role: this.config.role,
            capabilities: this.config.capabilities,
            version: '1.0.0'
          }
        });
        
        // Start heartbeat
        this.startHeartbeat();
        
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[Agent SDK] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        console.log('[Agent SDK] Disconnected from Mission Control');
        this.connected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('[Agent SDK] WebSocket error:', err);
        reject(err);
      });
    });
  }

  /**
   * Send message to Mission Control
   */
  send(message) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    switch (message.type) {
      case 'REGISTERED':
        this.agentId = message.payload.agentId;
        console.log('[Agent SDK] Registered as agent:', this.agentId);
        break;
        
      case 'TASK_ASSIGNED':
        this.handleTask(message.payload);
        break;
        
      case 'KILL_SWITCH':
        console.log('[Agent SDK] Kill switch activated');
        if (this.killHandler) {
          this.killHandler();
        }
        this.disconnect();
        process.exit(0);
        break;
        
      case 'HEARTBEAT_ACK':
        // Heartbeat acknowledged
        break;
        
      default:
        console.log('[Agent SDK] Unknown message type:', message.type);
    }
  }

  /**
   * Handle assigned task
   */
  async handleTask(task) {
    console.log('[Agent SDK] Task assigned:', task.id, task.title);
    
    // Acknowledge task receipt
    this.send({
      type: 'TASK_ACK',
      payload: { taskId: task.id }
    });

    // Find handler for task type
    const handler = this.taskHandlers.get(task.type) || this.taskHandlers.get('default');
    
    if (!handler) {
      console.error('[Agent SDK] No handler for task type:', task.type);
      this.failTask(task.id, 'No handler registered for task type');
      return;
    }

    try {
      // Report task started
      this.send({
        type: 'TASK_STARTED',
        payload: { taskId: task.id, timestamp: new Date().toISOString() }
      });

      // Execute task
      const result = await handler(task);
      
      // Report completion
      this.completeTask(task.id, result);
    } catch (err) {
      console.error('[Agent SDK] Task failed:', err);
      this.failTask(task.id, err.message);
    }
  }

  /**
   * Register task handler
   */
  onTask(typeOrHandler, handler) {
    if (typeof typeOrHandler === 'function') {
      // Default handler
      this.taskHandlers.set('default', typeOrHandler);
    } else {
      // Type-specific handler
      this.taskHandlers.set(typeOrHandler, handler);
    }
  }

  /**
   * Register kill switch handler
   */
  onKill(handler) {
    this.killHandler = handler;
  }

  /**
   * Report task completion
   */
  completeTask(taskId, result) {
    this.send({
      type: 'TASK_COMPLETE',
      payload: {
        taskId,
        result: result || {},
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Report task failure
   */
  failTask(taskId, error) {
    this.send({
      type: 'TASK_FAILED',
      payload: {
        taskId,
        error: typeof error === 'string' ? error : error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Report task progress
   */
  reportProgress(taskId, progress, message) {
    this.send({
      type: 'TASK_PROGRESS',
      payload: {
        taskId,
        progress: Math.min(100, Math.max(0, progress)),
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.send({
          type: 'HEARTBEAT',
          payload: {
            timestamp: new Date().toISOString(),
            cpuPercent: this.getCpuUsage(),
            memoryMb: this.getMemoryUsage()
          }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    console.log('[Agent SDK] Reconnecting in 5 seconds...');
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        console.error('[Agent SDK] Reconnect failed:', err);
      });
    }, 5000);
  }

  /**
   * Get CPU usage (placeholder - implement per-platform)
   */
  getCpuUsage() {
    try {
      const usage = process.cpuUsage();
      return Math.round((usage.user + usage.system) / 1000000);
    } catch {
      return 0;
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    try {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Disconnect from Mission Control
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
    this.connected = false;
  }
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      config[key.replace(/-/g, '')] = value;
    }
  });

  const agent = new MissionControlAgent(config);
  
  // Default task handler
  agent.onTask(async (task) => {
    console.log('[Agent] Executing task:', task.title);
    // Override this with your task logic
    return { status: 'completed' };
  });
  
  // Kill switch handler
  agent.onKill(() => {
    console.log('[Agent] Kill switch received, shutting down...');
  });

  agent.connect().catch(err => {
    console.error('[Agent] Failed to connect:', err);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('[Agent] Shutting down...');
    agent.disconnect();
    process.exit(0);
  });
}

module.exports = { MissionControlAgent };
