/**
 * Kill Switch History API Endpoint
 * GET /api/kill-switch/history
 * 
 * Returns history of all kill events from audit log
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Query audit log for kill events
    const history = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['AGENT_KILLED', 'GLOBAL_KILL_SWITCH'],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Transform to kill event format
    const transformed = history.map((entry) => {
      const afterState = entry.afterState as { agentName?: string; reason?: string; killedBy?: string } | null;
      return {
        id: entry.id,
        agentId: entry.resourceId,
        agentName: afterState?.agentName || entry.actorName,
        reason: afterState?.reason || 'Kill switch activation',
        killedBy: afterState?.killedBy || entry.actorName,
        killedAt: entry.timestamp,
        globalKill: entry.action === 'GLOBAL_KILL_SWITCH',
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Kill history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kill history', details: (error as Error).message },
      { status: 500 }
    );
  }
}
