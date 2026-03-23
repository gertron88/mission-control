import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ActorType, AgentStatus } from '@prisma/client'

// GET /api/agents/[id] - Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: {
      assignedTasks: {
        where: { status: { not: 'DONE' } },
        orderBy: { priority: 'desc' },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      heartbeats: {
        orderBy: { timestamp: 'desc' },
        take: 24, // Last 24 heartbeats
      },
      tradingConfig: true,
    },
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  return NextResponse.json(agent)
}

// PATCH /api/agents/[id] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.status !== undefined) updateData.status = body.status
    if (body.avatar !== undefined) updateData.avatar = body.avatar
    if (body.capabilities !== undefined) updateData.capabilities = body.capabilities
    
    if (body.status === 'ONLINE' || body.status === 'BUSY') {
      updateData.lastSeenAt = new Date()
    }
    
    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: updateData,
    })
    
    return NextResponse.json(agent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
