/**
 * Kill Switch History API Endpoint
 * GET /api/kill-switch/history
 * 
 * Returns history of all kill events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const history = await prisma.killEvent.findMany({
      orderBy: {
        killedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Kill history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kill history', details: (error as Error).message },
      { status: 500 }
    );
  }
}
