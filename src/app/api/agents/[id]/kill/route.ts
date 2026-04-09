/**
 * Kill Agent API Endpoint
 * POST /api/agents/[id]/kill
 * 
 * Terminates an agent by setting status to OFFLINE and logging the kill event
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { reason = 'Manual kill switch activation' } = body;

    // Update agent status to OFFLINE
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        status: AgentStatus.OFFLINE,
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Create kill history entry
    await prisma.killEvent.create({
      data: {
        agentId: id,
        agentName: agent.name,
        reason,
        killedBy: 'manual',
        killedAt: new Date(),
      },
    });

    // Create audit log entry
    await prisma.auditEvent.create({
      data: {
        eventType: 'AGENT_KILLED',
        severity: 'HIGH',
        message: `Agent ${agent.name} terminated via kill switch`,
        agentId: id,
        payload: { reason, killedBy: 'manual' },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Agent ${agent.name} terminated`,
      agentId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Kill agent error:', error);
    return NextResponse.json(
      { error: 'Failed to kill agent', details: (error as Error).message },
      { status: 500 }
    );
  }
}
