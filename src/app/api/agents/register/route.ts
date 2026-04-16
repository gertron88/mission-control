/**
 * Agent Registration API
 * 
 * POST /api/agents/register
 * 
 * Simple endpoint for bots/agents to self-register
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit';
import { broadcastEvent } from '@/lib/events';
import { ActorType, AuditSeverity } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      handle, 
      name, 
      role = 'CUSTOM',
      model = 'kimi/kimi-code',
      apiKeyRef,
      maxLoad = 5,
      dailyTaskLimit = 100 
    } = body;

    if (!id || !handle) {
      return NextResponse.json(
        { error: 'Missing required fields: id, handle' },
        { status: 400 }
      );
    }

    // Check if agent already exists
    const existing = await prisma.agent.findUnique({
      where: { id },
    });

    if (existing) {
      // Update last seen
      await prisma.agent.update({
        where: { id },
        data: { lastSeenAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Agent already registered, updated lastSeen',
        agent: existing,
      });
    }

    // Create new agent
    const agent = await prisma.agent.create({
      data: {
        id,
        handle,
        name: name || handle,
        role,
        model,
        apiKeyRef: apiKeyRef || `api-key-${handle}`,
        status: 'ONLINE',
        maxLoad,
        dailyTaskLimit,
        currentLoad: 0,
        tasksToday: 0,
        lastSeenAt: new Date(),
      },
    });

    // Log registration
    await logAction({
      actorType: ActorType.AGENT,
      actorId: id,
      actorName: handle,
      action: 'AGENT_REGISTERED',
      resourceType: 'Agent',
      resourceId: id,
      afterState: agent,
      severity: AuditSeverity.INFO,
    });

    // Broadcast event
    broadcastEvent({
      type: 'AGENT_REGISTERED',
      agentId: id,
      data: {
        handle,
        name: agent.name,
        status: agent.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Agent registered successfully',
      agent,
    });

  } catch (error) {
    console.error('Failed to register agent:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}
