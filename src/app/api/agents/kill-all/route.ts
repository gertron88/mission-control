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

    // Create audit log entries for each killed agent
    const auditEntries = agentsToKill.map((agent) => ({
      action: 'AGENT_KILLED',
      actorType: 'HUMAN' as const,
      actorName: 'Global Kill Switch',
      resourceType: 'Agent',
      resourceId: agent.id,
      severity: 'CRITICAL' as const,
      beforeState: { status: agent.status },
      afterState: { status: 'OFFLINE', reason, killedBy: 'global-kill-switch' },
    }));

    await prisma.auditLog.createMany({
      data: auditEntries,
    });

    // Create global kill switch audit entry
    await prisma.auditLog.create({
      data: {
        action: 'GLOBAL_KILL_SWITCH',
        actorType: 'HUMAN',
        actorName: 'Kill Switch',
        resourceType: 'System',
        severity: 'CRITICAL',
        afterState: {
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
