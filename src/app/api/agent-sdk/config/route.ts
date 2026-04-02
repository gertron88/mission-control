/**
 * Agent SDK Config Endpoint
 * 
 * GET /api/agent-sdk/config - Returns connection configuration
 * Agents use this to get the correct WebSocket URL and settings
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get the host from the request
  const host = request.headers.get('host') || 'mission-control-sage-mu.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  const config = {
    // Connection details
    missionControlUrl: `${protocol}://${host}`,
    websocketUrl: `${protocol === 'https' ? 'wss' : 'ws'}://${host}/api/socket`,
    
    // SDK endpoints
    sdkUrl: `${protocol}://${host}/api/agent-sdk`,
    
    // Agent defaults
    defaults: {
      heartbeatInterval: 30000, // 30 seconds
      reconnectInterval: 5000,  // 5 seconds
      requestTimeout: 30000,    // 30 seconds
    },
    
    // Capabilities supported by this Mission Control instance
    supportedCapabilities: [
      'TASK_EXECUTION',
      'PROGRESS_REPORTING',
      'HEARTBEAT',
      'KILL_SWITCH',
      'FILE_UPLOAD',
      'LOG_STREAMING'
    ],
    
    // Version info
    version: '1.0.0',
    minAgentVersion: '1.0.0'
  };
  
  return NextResponse.json(config);
}
