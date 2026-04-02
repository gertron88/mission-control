/**
 * Activity Feed API
 * GET /api/activity - Returns recent activity logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');

    const activities = await prisma.auditLog.findMany({
      where: type ? { action: type } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        actorName: true,
        actorType: true,
        resourceType: true,
        resourceId: true,
        timestamp: true,
        afterState: true,
      }
    });

    // Transform to activity format
    const formatted = activities.map(a => ({
      id: a.id,
      type: a.action,
      actorName: a.actorName,
      actorType: a.actorType,
      resourceType: a.resourceType,
      resourceName: a.resourceId,
      message: formatActivityMessage(a),
      timestamp: a.timestamp.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json([], { status: 500 });
  }
}

function formatActivityMessage(log: any): string {
  const messages: Record<string, string> = {
    'TASK_CREATED': `Created task`,
    'TASK_COMPLETED': `Completed task`,
    'TASK_STARTED': `Started working on task`,
    'TASK_BLOCKED': `Blocked on task`,
    'PROJECT_CREATED': `Created project`,
    'CODE_PUSHED': `Pushed code changes`,
    'AGENT_REGISTERED': `Agent connected`,
    'ERROR_OCCURRED': `Error occurred`,
  };
  
  return messages[log.action] || `${log.action} on ${log.resourceType}`;
}
