/**
 * Staleness Detection Cron Job
 * 
 * Runs every 5 minutes to:
 * 1. Detect and mark stale agents (no heartbeat in 5+ min)
 * 2. Detect hung tasks (running > 30 min with no update)
 * 3. Escalate/retry failed/stale tasks
 * 4. Recalculate project progress from ground truth
 * 5. Emit events for all changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';
import { ActorType, AuditSeverity, TaskStatus, AgentStatus, Prisma } from '@prisma/client';
import { getServices } from '@/services';

// Configuration
const STALE_AGENT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const HUNG_TASK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MAX_TASK_RUNTIME_MS = 2 * 60 * 60 * 1000; // 2 hours (hard limit)

export const dynamic = 'force-dynamic';

/**
 * Verify cron secret to prevent unauthorized access
 */
function verifyCronAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return auth === expected;
}

/**
 * Mark agents as OFFLINE if they haven't sent a heartbeat recently
 */
async function detectStaleAgents(now: Date): Promise<{
  markedOffline: number;
  details: Array<{ id: string; handle: string; lastSeen: Date | null }>;
}> {
  const staleThreshold = new Date(now.getTime() - STALE_AGENT_THRESHOLD_MS);

  // Find stale agents
  const staleAgents = await prisma.agent.findMany({
    where: {
      status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY, AgentStatus.AWAY] },
      OR: [
        { lastSeenAt: { lt: staleThreshold } },
        { lastSeenAt: null },
      ],
    },
    select: { id: true, handle: true, lastSeenAt: true },
  });

  if (staleAgents.length === 0) {
    return { markedOffline: 0, details: [] };
  }

  // Mark them offline
  await prisma.agent.updateMany({
    where: {
      id: { in: staleAgents.map((a) => a.id) },
    },
    data: {
      status: AgentStatus.OFFLINE,
      updatedAt: now,
    },
  });

  // Log and broadcast each staleness event
  for (const agent of staleAgents) {
    await logAction({
      actorType: ActorType.SCHEDULER,
      actorId: 'staleness-check',
      actorName: 'Staleness Checker',
      action: 'AGENT_MARKED_STALE',
      resourceType: 'Agent',
      resourceId: agent.id,
      afterState: { status: AgentStatus.OFFLINE, reason: 'No heartbeat received' },
      severity: AuditSeverity.WARNING,
    });

    broadcastEvent({
      type: 'AGENT_STATUS_CHANGED',
      agentId: agent.id,
      data: {
        status: AgentStatus.OFFLINE,
        reason: 'STALE_HEARTBEAT',
        lastSeenAt: agent.lastSeenAt,
      },
    });
  }

  return {
    markedOffline: staleAgents.length,
    details: staleAgents.map((a) => ({
      id: a.id,
      handle: a.handle,
      lastSeen: a.lastSeenAt,
    })),
  };
}

/**
 * Detect tasks that are running but haven't updated recently
 * This catches hung tasks or tasks where the agent died
 */
async function detectHungTasks(now: Date): Promise<{
  hungTasks: number;
  failedTasks: number;
  retriedTasks: number;
  details: Array<{
    id: string;
    title: string;
    status: string;
    reason: string;
  }>;
}> {
  const hungThreshold = new Date(now.getTime() - HUNG_TASK_THRESHOLD_MS);
  const maxRuntimeThreshold = new Date(now.getTime() - MAX_TASK_RUNTIME_MS);

  // Find running tasks that haven't been updated recently
  const potentiallyHungTasks = await prisma.task.findMany({
    where: {
      status: TaskStatus.RUNNING,
      OR: [
        { updatedAt: { lt: hungThreshold } },
        { startedAt: { lt: maxRuntimeThreshold } },
      ],
      isDeleted: false,
    },
    include: {
      assignee: { select: { id: true, handle: true, status: true } },
    },
  });

  const results = {
    hungTasks: 0,
    failedTasks: 0,
    retriedTasks: 0,
    details: [] as Array<{ id: string; title: string; status: string; reason: string }>,
  };

  for (const task of potentiallyHungTasks) {
    const startedAt = task.startedAt;
    const runtime = startedAt ? now.getTime() - startedAt.getTime() : 0;

    // Determine severity based on runtime
    if (runtime > MAX_TASK_RUNTIME_MS) {
      // Hard limit exceeded - fail the task
      await handleTaskFailure(task, now, 'MAX_RUNTIME_EXCEEDED');
      results.failedTasks++;
      results.details.push({
        id: task.id,
        title: task.title,
        status: 'FAILED',
        reason: `Runtime ${Math.round(runtime / 60000)}min exceeded max ${MAX_TASK_RUNTIME_MS / 60000}min`,
      });
    } else if (!task.assignee || task.assignee.status === AgentStatus.OFFLINE) {
      // Agent is offline - retry if possible
      const retryResult = await attemptTaskRetry({...task, assigneeId: task.assigneeId}, now);
      if (retryResult.success) {
        results.retriedTasks++;
        results.details.push({
          id: task.id,
          title: task.title,
          status: 'RETRYING',
          reason: 'Agent offline, reassigned',
        });
      } else {
        results.failedTasks++;
        results.details.push({
          id: task.id,
          title: task.title,
          status: 'FAILED',
          reason: retryResult.reason || 'Retry failed',
        });
      }
    } else {
      // Agent is online but task seems stuck - log warning
      await logAction({
        actorType: ActorType.SCHEDULER,
        actorId: 'staleness-check',
        actorName: 'Staleness Checker',
        action: 'TASK_POTENTIALLY_HUNG',
        resourceType: 'Task',
        resourceId: task.id,
        afterState: {
          runtimeMinutes: Math.round(runtime / 60000),
          assigneeId: task.assigneeId,
          lastUpdate: task.updatedAt,
        },
        severity: AuditSeverity.WARNING,
      });

      results.hungTasks++;
      results.details.push({
        id: task.id,
        title: task.title,
        status: 'WARNING',
        reason: `No update for ${Math.round((now.getTime() - task.updatedAt.getTime()) / 60000)}min`,
      });
    }
  }

  return results;
}

/**
 * Fail a task that exceeded max runtime
 */
async function handleTaskFailure(
  task: { id: string; title: string; assigneeId: string | null; retryCount: number; maxRetries: number },
  now: Date,
  reason: string
): Promise<void> {
  const statusHistory = (task as unknown as { statusHistory: unknown[] }).statusHistory || [];
  statusHistory.push({
    status: TaskStatus.FAILED,
    timestamp: now.toISOString(),
    actor: 'system',
    reason: `Auto-failed: ${reason}`,
  });

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.FAILED,
      statusHistory: statusHistory as Prisma.InputJsonValue,
      updatedAt: now,
    },
  });

  await logAction({
    actorType: ActorType.SCHEDULER,
    actorId: 'staleness-check',
    actorName: 'Staleness Checker',
    action: 'TASK_AUTO_FAILED',
    resourceType: 'Task',
    resourceId: task.id,
    afterState: { reason, previousStatus: TaskStatus.RUNNING },
    severity: AuditSeverity.ERROR,
  });

  broadcastEvent({
    type: 'TASK_STATUS_CHANGED',
    taskId: task.id,
    data: {
      previousStatus: TaskStatus.RUNNING,
      newStatus: TaskStatus.FAILED,
      reason,
      autoTriggered: true,
    },
  });
}

/**
 * Attempt to retry a task by reassigning it
 */
async function attemptTaskRetry(
  task: { id: string; title: string; assigneeId: string | null; retryCount: number; maxRetries: number },
  now: Date
): Promise<{ success: boolean; reason?: string }> {
  if (task.retryCount >= task.maxRetries) {
    await handleTaskFailure(task, now, 'MAX_RETRIES_EXCEEDED');
    return { success: false, reason: 'Max retries exceeded' };
  }

  // Reset to READY state for reassignment
  const statusHistory = (task as unknown as { statusHistory: unknown[] }).statusHistory || [];
  statusHistory.push({
    status: TaskStatus.READY,
    timestamp: now.toISOString(),
    actor: 'system',
    reason: 'Agent offline, resetting for reassignment',
  });

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.READY,
      assigneeId: null,
      assignedAt: null,
      retryCount: { increment: 1 },
      statusHistory: statusHistory as Prisma.InputJsonValue,
      updatedAt: now,
    },
  });

  await logAction({
    actorType: ActorType.SCHEDULER,
    actorId: 'staleness-check',
    actorName: 'Staleness Checker',
    action: 'TASK_RETRY_TRIGGERED',
    resourceType: 'Task',
    resourceId: task.id,
    afterState: { retryCount: task.retryCount + 1 },
    severity: AuditSeverity.INFO,
  });

  broadcastEvent({
    type: 'TASK_STATUS_CHANGED',
    taskId: task.id,
    data: {
      previousStatus: TaskStatus.RUNNING,
      newStatus: TaskStatus.READY,
      reason: 'Agent offline, awaiting reassignment',
      autoTriggered: true,
    },
  });

  return { success: true };
}

/**
 * Recalculate project progress from actual task completion
 * This ensures projects don't show stale progress percentages
 */
async function recalculateProjectProgress(): Promise<{
  projectsUpdated: number;
  details: Array<{ id: string; name: string; oldProgress: number; newProgress: number }>;
}> {
  const projects = await prisma.project.findMany({
    where: { isArchived: false },
    include: {
      tasks: {
        where: { isDeleted: false },
        select: { id: true, status: true },
      },
    },
  });

  const updates: Array<{ id: string; name: string; oldProgress: number; newProgress: number }> = [];

  for (const project of projects) {
    const totalTasks = project.tasks.length;
    if (totalTasks === 0) continue;

    const completedTasks = project.tasks.filter(
      (t) => t.status === TaskStatus.COMPLETE || t.status === TaskStatus.CANCELED
    ).length;

    const newProgress = Math.round((completedTasks / totalTasks) * 100);

    if (newProgress !== project.progress) {
      await prisma.project.update({
        where: { id: project.id },
        data: { progress: newProgress, updatedAt: new Date() },
      });

      updates.push({
        id: project.id,
        name: project.name,
        oldProgress: project.progress,
        newProgress,
      });

      broadcastEvent({
        type: 'PROJECT_PROGRESS_UPDATED',
        projectId: project.id,
        data: { progress: newProgress, totalTasks, completedTasks },
      });
    }
  }

  return {
    projectsUpdated: updates.length,
    details: updates,
  };
}

/**
 * Main handler
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startTime = Date.now();

  try {
    // Run all staleness checks
    const [staleAgents, hungTasks, progressUpdate] = await Promise.all([
      detectStaleAgents(now),
      detectHungTasks(now),
      recalculateProjectProgress(),
    ]);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      durationMs: duration,
      results: {
        agents: staleAgents,
        tasks: hungTasks,
        projects: progressUpdate,
      },
    });
  } catch (error) {
    console.error('Staleness check failed:', error);

    await logAction({
      actorType: ActorType.SYSTEM,
      actorId: 'staleness-check',
      actorName: 'Staleness Checker',
      action: 'STALENESS_CHECK_FAILED',
      resourceType: 'System',
      resourceId: 'staleness-check',
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
