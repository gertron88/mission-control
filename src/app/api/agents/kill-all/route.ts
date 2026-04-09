/**
 * Kill All Agents API Endpoint
 * POST /api/agents/kill-all
 * 
 * Terminates all online agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reason = 'Global kill switch activation' } = body;

    // Find all online/busy agents
    const agentsToKill = await prisma.agent.findMany({
      where: {
        status: {
          in: [AgentStatus.ONLINE, AgentStatus.BUSY],
        },
        isActive: true,
      },
    });

    if (agentsToKill.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No online agents to terminate',
        killedCount: 0,
      });
    }

    // Update all agents to OFFLINE
    const updateResult = await prisma.agent.updateMany({
      where: {
        status: {
          in: [AgentStatus.ONLINE, AgentStatus.BUSY],
        },
        isActive: true,
      },
      data: {
        status: AgentStatus.OFFLINE,
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Create kill events for each agent
    const killEvents = agentsToKill.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      reason,
      killedBy: 'global-kill-switch',
      killedAt: new Date(),
    }));

    await prisma.killEvent.createMany({
      data: killEvents,
    });

    // Create audit log entry
    await prisma.auditEvent.create({
      data: {
        eventType: 'GLOBAL_KILL_SWITCH',
        severity: 'CRITICAL',
        message: `Global kill switch activated - ${agentsToKill.length} agents terminated`,
        payload: {
          reason,
          killedCount: agentsToKill.length,
          agentIds: agentsToKill.map((a) => a.id),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${agentsToKill.length} agents terminated`,
      killedCount: agentsToKill.length,
      agentIds: agentsToKill.map((a) => a.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Kill all agents error:', error);
    return NextResponse.json(
      { error: 'Failed to kill all agents', details: (error as Error).message },
      { status: 500 }
    );
  }
}
