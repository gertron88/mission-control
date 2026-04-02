/**
 * Throughput Metrics API
 * GET /api/metrics/throughput - Returns hourly task completion counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get last 24 hours of completed tasks
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const tasks = await prisma.task.findMany({
      where: {
        status: 'COMPLETE',
        completedAt: {
          gte: since
        }
      },
      select: {
        completedAt: true
      }
    });

    // Group by hour
    const hourlyData: Record<string, number> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = new Date(since);
      hour.setHours(hour.getHours() + i);
      const key = hour.toISOString().slice(11, 13) + ':00';
      hourlyData[key] = 0;
    }

    // Count tasks per hour
    tasks.forEach(task => {
      if (task.completedAt) {
        const hour = task.completedAt.toISOString().slice(11, 13) + ':00';
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      }
    });

    // Convert to array
    const data = Object.entries(hourlyData).map(([hour, count]) => ({
      hour,
      count
    }));

    return NextResponse.json({
      data,
      total: tasks.length,
      period: '24h'
    });
  } catch (error) {
    console.error('Failed to fetch throughput:', error);
    return NextResponse.json({ data: [], total: 0, period: '24h' });
  }
}
