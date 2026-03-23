import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ActorType } from '@prisma/client'

// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const includeOffline = searchParams.get('includeOffline') === 'true'
  
  const agents = await prisma.agent.findMany({
    where: includeOffline ? undefined : { status: { not: 'OFFLINE' } },
    include: {
      _count: {
        select: {
          assignedTasks: {
            where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } },
          },
        },
      },
      heartbeats: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      tradingConfig: true,
    },
    orderBy: { lastSeenAt: 'desc' },
  })
  
  return NextResponse.json(agents)
}

// POST /api/agents - Register new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const agent = await prisma.agent.create({
      data: {
        handle: body.handle,
        name: body.name,
        role: body.role,
        model: body.model || 'kimi-coding/k2p5',
        apiKeyRef: body.apiKeyRef,
        capabilities: body.capabilities || [],
        status: 'OFFLINE',
      },
    })
    
    await logAction({
      actorType: ActorType.SYSTEM,
      actorName: 'System',
      action: 'AGENT_REGISTERED',
      resourceType: 'Agent',
      resourceId: agent.id,
      afterState: agent as unknown as Record<string, unknown>,
    })
    
    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Failed to register agent:', error)
    return NextResponse.json({ error: 'Failed to register agent' }, { status: 500 })
  }
}
