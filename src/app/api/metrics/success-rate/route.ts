/**
 * Success Rate Metrics API
 * GET /api/metrics/success-rate - Returns task success/failure stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get last 7 days
    const since = new Date();
    since.setDate(since.getDate() - 7);

    // Get completed tasks
    const completed = await prisma.task.count({
      where: {
        status: 'COMPLETE',
        completedAt: {
          gte: since
        }
      }
    });

    // Get failed tasks
    const failed = await prisma.task.count({
      where: {
        status: 'FAILED',
        updatedAt: {
          gte: since
        }
      }
    });

    // Get retried tasks (retryCount > 0 and completed)
    const retried = await prisma.task.count({
      where: {
        status: 'COMPLETE',
        retryCount: {
          gt: 0
        },
        completedAt: {
          gte: since
        }
      }
    });

    const total = completed + failed;
    const rate = total > 0 ? (completed / total) * 100 : 0;

    return NextResponse.json({
      rate,
      completed,
      failed,
      retried,
      period: '7d'
    });
  } catch (error) {
    console.error('Failed to fetch success rate:', error);
    return NextResponse.json({ rate: 0, completed: 0, failed: 0, retried: 0, period: '7d' });
  }
}
