import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type, // 'SCANNER_OPPORTUNITY' | 'SCANNER_MATCH' | 'SCANNER_HEARTBEAT' | 'SCANNER_LOG'
      agentId = 'hudson-scanner',
      agentName = 'Hudson Scanner',
      projectId,
      payload,
    } = body;

    // Validate and normalize event type
    const validTypes = ['SCANNER_OPPORTUNITY', 'SCANNER_MATCH', 'SCANNER_HEARTBEAT', 'SCANNER_LOG', 'SCANNER_PAIRS', 'LIVE_PRICES', 'LOW_BALANCE_ALERT'];
    const normalizedType = validTypes.includes(type) ? type : 'SCANNER_LOG';

    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing type or payload' },
        { status: 400 }
      );
    }

    // Store in generic Event store
    const event = await prisma.event.create({
      data: {
        type: normalizedType,
        aggregateType: 'SCANNER',
        aggregateId: agentId,
        payload,
        actorType: 'AGENT',
        actorId: agentId,
        metadata: {
          projectId,
          agentName,
          source: 'polymarket-kalshi-arb',
          receivedAt: new Date().toISOString(),
        },
      },
    });

    // Also create an audit log for traceability
    await prisma.auditLog.create({
      data: {
        actorType: 'AGENT',
        actorId: agentId,
        actorName: agentName,
        action: type,
        resourceType: 'SCANNER',
        resourceId: event.id,
        afterState: payload,
        severity: type === 'SCANNER_HEARTBEAT' ? 'DEBUG' : 'INFO',
      },
    });

    // Broadcast to SSE subscribers for live UI updates
    broadcastEvent({
      type,
      agentId,
      agentName,
      payload,
      metadata: {
        projectId,
        source: 'polymarket-kalshi-arb',
        receivedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: event.id });
  } catch (error) {
    console.error('Failed to store scanner event:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const since = searchParams.get('since');

    const events = await prisma.event.findMany({
      where: {
        aggregateType: 'SCANNER',
        ...(type ? { type } : {}),
        ...(since ? { timestamp: { gte: new Date(since) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const formatted = events.map((e) => ({
      id: e.id,
      type: e.type,
      agentId: e.actorId,
      payload: e.payload,
      metadata: e.metadata,
      timestamp: e.timestamp.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch scanner events:', error);
    return NextResponse.json([], { status: 500 });
  }
}
