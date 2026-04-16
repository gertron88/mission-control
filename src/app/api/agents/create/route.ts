/**
 * Create Agent API - Direct agent creation
 * 
 * POST /api/agents/create
 * 
 * Bypasses registration check and directly creates agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Create or update agent
    const agent = await prisma.agent.upsert({
      where: { id },
      update: {
        lastSeenAt: new Date(),
        status: 'ONLINE',
      },
      create: {
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

    return NextResponse.json({
      success: true,
      agent,
    });

  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: String(error) },
      { status: 500 }
    );
  }
}

// Also handle GET for checking
export async function GET() {
  try {
    const agents = await prisma.agent.findMany();
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
