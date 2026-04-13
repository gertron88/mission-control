import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['FILLED', 'PARTIALLY_FILLED'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      size: Number(o.size),
      price: Number(o.executedPrice || o.price || 0),
      executedAt: o.createdAt.toISOString(),
      agent: o.agentId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch trades:', error);
    return NextResponse.json([], { status: 500 });
  }
}
