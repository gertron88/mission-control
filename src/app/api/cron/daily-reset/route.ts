/**
 * Daily Reset Cron Job
 * 
 * Runs at midnight UTC to:
 * 1. Reset daily task counters for all agents
 * 2. Reset trading daily loss limits
 * 3. Wake up agents that hit rate limits (if reset conditions met)
 * 4. Clean up old heartbeat records
 * 5. Archive old audit logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';
import { ActorType, AuditSeverity, AgentStatus, Prisma } from '@prisma/client';
import { getServices } from '@/services';

// Configuration
const HEARTBEAT_RETENTION_DAYS = 7;
const AUDIT_LOG_RETENTION_DAYS = 90;

export const dynamic = 'force-dynamic';

function verifyCronAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return auth === expected;
}

/**
 * Reset daily task counters for all agents
 */
async function resetDailyTaskLimits(now: Date): Promise<{
  agentsReset: number;
  reactivated: number;
  details: Array<{ id: string; handle: string; previousCount: number; wasReactivated: boolean }>;
}> {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Find all agents that need reset
  const agents = await prisma.agent.findMany({
    where: {
      OR: [
        { lastTaskDate: { lt: today } },
        { lastTaskDate: { equals: null } },
      ],
    },
    select: {
      id: true,
      handle: true,
      tasksToday: true,
      status: true,
      disabledReason: true,
    },
  });

  const details: Array<{
    id: string;
    handle: string;
    previousCount: number;
    wasReactivated: boolean;
  }> = [];

  for (const agent of agents) {
    const wasRateLimited =
      agent.status === AgentStatus.DISABLED &&
      agent.disabledReason === 'DAILY_LIMIT_REACHED';

    // Reset counter and update last task date
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        tasksToday: 0,
        lastTaskDate: now,
        // Reactivate if they were rate-limited
        ...(wasRateLimited && {
          status: AgentStatus.ONLINE,
          disabledReason: null,
        }),
      },
    });

    details.push({
      id: agent.id,
      handle: agent.handle,
      previousCount: agent.tasksToday,
      wasReactivated: wasRateLimited,
    });

    // Broadcast reactivation
    if (wasRateLimited) {
      broadcastEvent({
        type: 'AGENT_STATUS_CHANGED',
        agentId: agent.id,
        data: {
          status: AgentStatus.ONLINE,
          reason: 'DAILY_LIMIT_RESET',
          previousStatus: AgentStatus.DISABLED,
        },
      });

      await logAction({
        actorType: ActorType.SCHEDULER,
        actorId: 'daily-reset',
        actorName: 'Daily Reset',
        action: 'AGENT_REACTIVATED',
        resourceType: 'Agent',
        resourceId: agent.id,
        afterState: { reason: 'Daily rate limit reset' },
        severity: AuditSeverity.INFO,
      });
    }
  }

  return {
    agentsReset: agents.length,
    reactivated: details.filter((d) => d.wasReactivated).length,
    details,
  };
}

/**
 * Reset trading daily loss limits
 */
async function resetTradingLimits(now: Date): Promise<{
  configsReset: number;
  details: Array<{ agentId: string; previousLoss: number }>;
}> {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const configs = await prisma.tradingConfig.findMany({
    where: {
      lastResetDate: { lt: today },
    },
    select: {
      id: true,
      agentId: true,
      dailyLossCurrent: true,
    },
  });

  for (const config of configs) {
    await prisma.tradingConfig.update({
      where: { id: config.id },
      data: {
        dailyLossCurrent: 0,
        lastResetDate: now,
      },
    });

    // Broadcast event if they had losses
    if (Number(config.dailyLossCurrent) > 0) {
      broadcastEvent({
        type: 'TRADING_LIMITS_RESET',
        agentId: config.agentId,
        data: {
          previousDailyLoss: Number(config.dailyLossCurrent),
          resetAt: now.toISOString(),
        },
      });
    }
  }

  return {
    configsReset: configs.length,
    details: configs.map((c) => ({
      agentId: c.agentId,
      previousLoss: Number(c.dailyLossCurrent),
    })),
  };
}

/**
 * Clean up old heartbeat records to prevent DB bloat
 */
async function cleanupOldHeartbeats(now: Date): Promise<{
  deleted: number;
}> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - HEARTBEAT_RETENTION_DAYS);

  const result = await prisma.agentHeartbeat.deleteMany({
    where: {
      timestamp: { lt: cutoff },
    },
  });

  return { deleted: result.count };
}

/**
 * Archive old audit logs (soft delete)
 */
async function archiveOldAuditLogs(now: Date): Promise<{
  archived: number;
}> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);

  const result = await prisma.auditLog.updateMany({
    where: {
      timestamp: { lt: cutoff },
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });

  return { archived: result.count };
}

/**
 * Check for any agents stuck in ERROR state and attempt recovery
 */
async function attemptAgentRecovery(now: Date): Promise<{
  attempted: number;
  recovered: number;
  details: Array<{ id: string; handle: string; success: boolean; reason: string }>;
}> {
  const errorAgents = await prisma.agent.findMany({
    where: {
      status: AgentStatus.ERROR,
      updatedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) }, // 1 hour ago
    },
    select: {
      id: true,
      handle: true,
      lastSeenAt: true,
    },
  });

  const details: Array<{ id: string; handle: string; success: boolean; reason: string }> = [];

  for (const agent of errorAgents) {
    // Check if agent has sent a heartbeat recently (maybe recovered on its own)
    const recentHeartbeat = await prisma.agentHeartbeat.findFirst({
      where: {
        agentId: agent.id,
        timestamp: { gt: new Date(now.getTime() - 10 * 60 * 1000) }, // 10 min
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentHeartbeat) {
      // Agent is actually healthy, just hasn't updated status
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: AgentStatus.ONLINE,
          lastSeenAt: recentHeartbeat.timestamp,
        },
      });

      details.push({
        id: agent.id,
        handle: agent.handle,
        success: true,
        reason: 'Recent heartbeat detected',
      });

      broadcastEvent({
        type: 'AGENT_STATUS_CHANGED',
        agentId: agent.id,
        data: {
          status: AgentStatus.ONLINE,
          reason: 'AUTO_RECOVERY',
          previousStatus: AgentStatus.ERROR,
        },
      });
    } else {
      details.push({
        id: agent.id,
        handle: agent.handle,
        success: false,
        reason: 'No recent heartbeat',
      });
    }
  }

  return {
    attempted: errorAgents.length,
    recovered: details.filter((d) => d.success).length,
    details,
  };
}

/**
 * Main handler
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startTime = Date.now();

  try {
    // Run all reset operations
    const [taskLimits, tradingLimits, heartbeatCleanup, auditArchive, recovery] =
      await Promise.all([
        resetDailyTaskLimits(now),
        resetTradingLimits(now),
        cleanupOldHeartbeats(now),
        archiveOldAuditLogs(now),
        attemptAgentRecovery(now),
      ]);

    const duration = Date.now() - startTime;

    // Log completion
    await logAction({
      actorType: ActorType.SCHEDULER,
      actorId: 'daily-reset',
      actorName: 'Daily Reset',
      action: 'DAILY_RESET_COMPLETED',
      resourceType: 'System',
      resourceId: 'daily-reset',
      afterState: {
        agentsReset: taskLimits.agentsReset,
        agentsReactivated: taskLimits.reactivated,
        tradingConfigsReset: tradingLimits.configsReset,
        heartbeatsDeleted: heartbeatCleanup.deleted,
        auditLogsArchived: auditArchive.archived,
        agentsRecovered: recovery.recovered,
      },
      severity: AuditSeverity.INFO,
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      durationMs: duration,
      results: {
        taskLimits,
        tradingLimits,
        maintenance: {
          heartbeatsCleaned: heartbeatCleanup.deleted,
          auditLogsArchived: auditArchive.archived,
        },
        recovery,
      },
    });
  } catch (error) {
    console.error('Daily reset failed:', error);

    await logAction({
      actorType: ActorType.SYSTEM,
      actorId: 'daily-reset',
      actorName: 'Daily Reset',
      action: 'DAILY_RESET_FAILED',
      resourceType: 'System',
      resourceId: 'daily-reset',
      afterState: { error: (error as Error).message },
      severity: AuditSeverity.CRITICAL,
    });

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: now.toISOString(),
      },
      { status: 500 }
    );
  }
}
