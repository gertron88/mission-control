import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const positions = await prisma.position.findMany({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });

    const formatted = positions.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side,
      size: Number(p.size),
      entryPrice: Number(p.entryPrice),
      currentPrice: Number(p.entryPrice), // TODO: fetch live price
      pnl: Number(p.unrealizedPnl || 0),
      pnlPercent: p.pnlPercent || 0,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch positions:', error);
    return NextResponse.json([], { status: 500 });
  }
}
