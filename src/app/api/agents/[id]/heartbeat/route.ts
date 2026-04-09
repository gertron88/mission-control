/**
 * Enhanced Agent Heartbeat API
 * 
 * POST /api/agents/[id]/heartbeat
 * 
 * Accepts comprehensive agent health data including:
 * - Basic status (online, busy, etc.)
 * - Resource metrics (CPU, memory)
 * - Current task information
 * - Rate limit status
 * - Current task duration (for hang detection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit';
import { broadcastEvent } from '@/lib/events';
import { ActorType, AuditSeverity } from '@prisma/client';
import { z } from 'zod';

// Validation schema for heartbeat payload
const heartbeatSchema = z.object({
  status: z.enum(['ONLINE', 'BUSY', 'AWAY', 'OFFLINE', 'ERROR']).optional(),
  
  // Resource metrics
  cpuUsage: z.number().min(0).max(100).optional(),
  memoryUsage: z.number().min(0).optional(),
  memoryUsagePercent: z.number().min(0).max(100).optional(),
  diskUsage: z.number().min(0).max(100).optional(),
  networkLatency: z.number().min(0).optional(),
  
  // Task information
  activeTaskCount: z.number().min(0).default(0),
  currentTaskId: z.string().optional(),
  currentTaskStartedAt: z.string().datetime().optional(),
  
  // Rate limit status
  rateLimits: z.object({
    requestsRemaining: z.number().min(0).optional(),
    requestsLimit: z.number().min(0).optional(),
    resetAt: z.string().datetime().optional(),
    hitLimit: z.boolean().default(false),
  }).optional(),
  
  // Usage tracking
  tasksCompletedToday: z.number().min(0).optional(),
  lastSuccessfulTaskAt: z.string().datetime().optional(),
  
  // Error state
  errorMessage: z.string().optional(),
  errorCount: z.number().min(0).optional(),
  
  // Flexible metadata
  metadata: z.record(z.unknown()).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = heartbeatSchema.parse(body);
    const now = new Date();

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        handle: true,
        status: true,
        maxLoad: true,
        dailyTaskLimit: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Determine new status
    let newStatus = validated.status || agent.status;
    
    // Auto-detect BUSY status based on active tasks
    if (validated.activeTaskCount > 0 && newStatus === 'ONLINE') {
      newStatus = 'BUSY';
    }
    
    // Check for ERROR state
    if (validated.errorMessage || (validated.errorCount && validated.errorCount > 5)) {
      newStatus = 'ERROR';
    }

    // Check rate limits - disable agent if hit
    if (validated.rateLimits?.hitLimit) {
      newStatus = 'DISABLED';
      
      await logAction({
        actorType: ActorType.AGENT,
        actorId: params.id,
        actorName: agent.handle,
        action: 'AGENT_RATE_LIMITED',
        resourceType: 'Agent',
        resourceId: params.id,
        afterState: {
          rateLimit: validated.rateLimits,
          reason: 'Rate limit hit',
        },
        severity: AuditSeverity.WARNING,
      });

      // Broadcast rate limit event
      broadcastEvent({
        type: 'AGENT_RATE_LIMITED',
        agentId: params.id,
        data: {
          resetAt: validated.rateLimits.resetAt,
          reason: 'Daily rate limit reached',
        },
      });
    }

    // Check task duration for hang detection
    let hangWarning = null;
    if (validated.currentTaskId && validated.currentTaskStartedAt) {
      const taskDuration = now.getTime() - new Date(validated.currentTaskStartedAt).getTime();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      const TWO_HOURS = 2 * 60 * 60 * 1000;

      if (taskDuration > TWO_HOURS) {
        hangWarning = 'TASK_EXCEEDED_MAX_RUNTIME';
        
        await logAction({
          actorType: ActorType.AGENT,
          actorId: params.id,
          actorName: agent.handle,
          action: 'TASK_RUNTIME_WARNING',
          resourceType: 'Task',
          resourceId: validated.currentTaskId,
          afterState: {
            durationMs: taskDuration,
            threshold: TWO_HOURS,
          },
          severity: AuditSeverity.WARNING,
        });
      } else if (taskDuration > THIRTY_MINUTES) {
        hangWarning = 'TASK_LONG_RUNNING';
      }
    }

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        lastSeenAt: now,
        currentLoad: validated.activeTaskCount,
        // Update performance stats if provided
        ...(validated.tasksCompletedToday !== undefined && {
          tasksToday: validated.tasksCompletedToday,
        }),
        ...(validated.lastSuccessfulTaskAt && {
          lastTaskDate: new Date(validated.lastSuccessfulTaskAt),
        }),
      },
    });

    // Record heartbeat
    const heartbeat = await prisma.agentHeartbeat.create({
      data: {
        agentId: params.id,
        cpuUsage: validated.cpuUsage,
        memoryUsage: validated.memoryUsage,
        activeTaskCount: validated.activeTaskCount,
        metadata: {
          ...validated.metadata,
          rateLimits: validated.rateLimits,
          currentTaskId: validated.currentTaskId,
          currentTaskStartedAt: validated.currentTaskStartedAt,
          hangWarning,
          memoryUsagePercent: validated.memoryUsagePercent,
          diskUsage: validated.diskUsage,
          networkLatency: validated.networkLatency,
        } as Record<string, unknown>,
      },
    });

    // Log status change
    if (newStatus !== agent.status) {
      await logAction({
        actorType: ActorType.AGENT,
        actorId: params.id,
        actorName: agent.handle,
        action: 'AGENT_STATUS_CHANGED',
        resourceType: 'Agent',
        resourceId: params.id,
        beforeState: { status: agent.status },
        afterState: { status: newStatus },
        severity: AuditSeverity.INFO,
      });
    }

    // Broadcast heartbeat event
    broadcastEvent({
      type: 'AGENT_HEARTBEAT',
      agentId: params.id,
      data: {
        timestamp: now.toISOString(),
        status: newStatus,
        load: validated.activeTaskCount,
        maxLoad: agent.maxLoad,
        metrics: {
          cpuUsage: validated.cpuUsage,
          memoryUsage: validated.memoryUsage,
          memoryUsagePercent: validated.memoryUsagePercent,
        },
        currentTaskId: validated.currentTaskId,
        hangWarning,
        rateLimits: validated.rateLimits,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      agent: {
        id: updatedAgent.id,
        status: updatedAgent.status,
        tasksToday: updatedAgent.tasksToday,
        dailyTaskLimit: agent.dailyTaskLimit,
      },
      warnings: hangWarning ? [hangWarning] : undefined,
    });

  } catch (error) {
    console.error('Failed to record heartbeat:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid heartbeat data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record heartbeat' },
      { status: 500 }
    );
  }
}
