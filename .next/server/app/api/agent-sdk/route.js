"use strict";(()=>{var e={};e.id=1684,e.ids=[1684],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6842:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>m,patchFetch:()=>k,requestAsyncStorage:()=>g,routeModule:()=>h,serverHooks:()=>u,staticGenerationAsyncStorage:()=>p});var a={};s.r(a),s.d(a,{GET:()=>d,dynamic:()=>l});var n=s(9303),r=s(8716),o=s(670),i=s(7070);let l="force-dynamic",c=`'use strict';

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
        console.log('[Agent SDK] Connected');
        this.connected = true;
        
        this.send({
          type: 'REGISTER',
          payload: {
            name: this.config.name,
            role: this.config.role,
            capabilities: this.config.capabilities,
            version: '1.0.0'
          }
        });
        
        this.startHeartbeat();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[Agent SDK] Parse error:', err);
        }
      });

      this.ws.on('close', () => {
        console.log('[Agent SDK] Disconnected');
        this.connected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('[Agent SDK] Error:', err);
        reject(err);
      });
    });
  }

  send(message) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'REGISTERED':
        this.agentId = message.payload.agentId;
        console.log('[Agent SDK] Registered:', this.agentId);
        break;
      case 'TASK_ASSIGNED':
        this.handleTask(message.payload);
        break;
      case 'KILL_SWITCH':
        console.log('[Agent SDK] Kill switch');
        if (this.killHandler) this.killHandler();
        this.disconnect();
        process.exit(0);
        break;
    }
  }

  async handleTask(task) {
    this.send({ type: 'TASK_ACK', payload: { taskId: task.id } });
    
    const handler = this.taskHandlers.get(task.type) || this.taskHandlers.get('default');
    if (!handler) {
      this.failTask(task.id, 'No handler');
      return;
    }

    try {
      this.send({ type: 'TASK_STARTED', payload: { taskId: task.id, timestamp: new Date().toISOString() } });
      const result = await handler(task);
      this.completeTask(task.id, result);
    } catch (err) {
      this.failTask(task.id, err.message);
    }
  }

  onTask(typeOrHandler, handler) {
    if (typeof typeOrHandler === 'function') {
      this.taskHandlers.set('default', typeOrHandler);
    } else {
      this.taskHandlers.set(typeOrHandler, handler);
    }
  }

  onKill(handler) {
    this.killHandler = handler;
  }

  completeTask(taskId, result) {
    this.send({
      type: 'TASK_COMPLETE',
      payload: { taskId, result: result || {}, timestamp: new Date().toISOString() }
    });
  }

  failTask(taskId, error) {
    this.send({
      type: 'TASK_FAILED',
      payload: { taskId, error: typeof error === 'string' ? error : error.message, timestamp: new Date().toISOString() }
    });
  }

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

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.connect().catch(() => {});
    }, 5000);
  }

  getCpuUsage() {
    try {
      const usage = process.cpuUsage();
      return Math.round((usage.user + usage.system) / 1000000);
    } catch { return 0; }
  }

  getMemoryUsage() {
    try {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    } catch { return 0; }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) this.ws.close();
    this.connected = false;
  }
}

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
  agent.onTask(async (task) => {
    console.log('[Agent] Task:', task.title);
    return { status: 'completed' };
  });
  agent.onKill(() => {
    console.log('[Agent] Killed');
    process.exit(0);
  });
  agent.connect().catch(() => process.exit(1));
}

module.exports = { MissionControlAgent };
`;async function d(e){return new i.NextResponse(c,{headers:{"Content-Type":"application/javascript","Cache-Control":"public, max-age=300"}})}let h=new n.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/agent-sdk/route",pathname:"/api/agent-sdk",filename:"route",bundlePath:"app/api/agent-sdk/route"},resolvedPagePath:"/home/gertron/.openclaw/workspace/mission-control/src/app/api/agent-sdk/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:g,staticGenerationAsyncStorage:p,serverHooks:u}=h,m="/api/agent-sdk/route";function k(){return(0,o.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:p})}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[8948,5972],()=>s(6842));module.exports=a})();