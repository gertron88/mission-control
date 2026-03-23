import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { broadcastEvent } from '@/lib/events'
import { ActorType, AuditSeverity } from '@prisma/client'

// POST /api/agents/[id]/heartbeat - Agent heartbeat
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Update agent status
    await prisma.agent.update({
      where: { id: params.id },
      data: {
        status: body.status || 'ONLINE',
        lastSeenAt: new Date(),
      },
    })
    
    // Record heartbeat
    const heartbeat = await prisma.agentHeartbeat.create({
      data: {
        agentId: params.id,
        cpuUsage: body.cpuUsage,
        memoryUsage: body.memoryUsage,
        activeTaskCount: body.activeTaskCount || 0,
        metadata: body.metadata,
      },
    })
    
    // Broadcast to connected clients
    broadcastEvent({
      type: 'AGENT_HEARTBEAT',
      agentId: params.id,
      data: heartbeat,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to record heartbeat:', error)
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 })
  }
}
