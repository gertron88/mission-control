import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { sendToDiscord } from '@/lib/discord'
import { broadcastEvent } from '@/lib/events'
import { 
  withErrorHandler, 
  withValidation, 
  successResponse,
  authenticateAgent,
  ApiError 
} from '@/lib/api-utils'
import { ActorType, TaskStatus, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

// Validation schema for updates
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum([
    'QUEUED', 'READY', 'ASSIGNED', 'RUNNING', 'AWAITING_DEPENDENCY',
    'AWAITING_VALIDATION', 'BLOCKED', 'FAILED', 'COMPLETE', 'CANCELED'
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedEffort: z.number().min(0).optional(),
  actualEffort: z.number().min(0).optional(),
  blockerType: z.string().nullable().optional(),
  blockerReason: z.string().nullable().optional(),
  blockerResolution: z.string().optional(),
  actualOutputs: z.record(z.any()).optional(),
  retryCount: z.number().optional(),
}).passthrough()

// Status transition validation
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  QUEUED: ['READY', 'ASSIGNED', 'CANCELED'],
  READY: ['ASSIGNED', 'QUEUED', 'CANCELED'],
  ASSIGNED: ['RUNNING', 'READY', 'CANCELED'],
  RUNNING: ['AWAITING_VALIDATION', 'BLOCKED', 'FAILED', 'COMPLETE'],
  AWAITING_DEPENDENCY: ['READY', 'BLOCKED', 'CANCELED'],
  AWAITING_VALIDATION: ['COMPLETE', 'FAILED', 'RUNNING'],
  BLOCKED: ['RUNNING', 'FAILED', 'CANCELED'],
  FAILED: ['QUEUED', 'CANCELED'],
  COMPLETE: [], // Terminal state
  CANCELED: ['QUEUED'], // Can be reopened
}

// GET /api/tasks/[id] - Get task details
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const task = await prisma.task.findFirst({
    where: { 
      id: params.id,
      isDeleted: false 
    },
    include: {
      assignee: { 
        select: { 
          id: true, 
          handle: true, 
          name: true, 
          avatar: true, 
          status: true,
          capabilities: true
        } 
      },
      creator: { 
        select: { id: true, handle: true, name: true } 
      },
      project: { 
        select: { id: true, name: true, slug: true, state: true } 
      },
      milestone: { 
        select: { id: true, name: true, state: true } 
      },
      parent: { 
        select: { id: true, number: true, title: true, status: true } 
      },
      subtasks: {
        select: { 
          id: true, 
          number: true, 
          title: true, 
          status: true, 
          priority: true,
          assignee: { select: { handle: true } }
        },
      },
      dependencies: { 
        select: { id: true, number: true, title: true, status: true } 
      },
      dependents: { 
        select: { id: true, number: true, title: true, status: true } 
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { 
          task: { select: { id: true } } 
        },
      },
      attachments: true,
      timeLogs: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!task) {
    throw new ApiError('NOT_FOUND', 'Task not found', 404)
  }

  return successResponse(task)
})

// PATCH /api/tasks/[id] - Update task
export const PATCH = withErrorHandler(
  withValidation(updateTaskSchema, async (data, request, { params }: { params: { id: string } }) => {
    const apiKey = request.headers.get('x-api-key') || ''
    const agent = await authenticateAgent(apiKey)

    // Get current task
    const currentTask = await prisma.task.findFirst({
      where: { id: params.id, isDeleted: false },
      include: {
        assignee: { select: { handle: true, id: true } },
        project: { select: { id: true, name: true } },
      },
    })

    if (!currentTask) {
      throw new ApiError('NOT_FOUND', 'Task not found', 404)
    }

    // Check permission (assignee, creator, or coordinator can update)
    const isAssignee = currentTask.assigneeId === agent.id
    const isCreator = currentTask.creatorId === agent.id
    const isCoordinator = agent.role === 'COORDINATOR'
    
    if (!isAssignee && !isCreator && !isCoordinator) {
      throw new ApiError(
        'FORBIDDEN', 
        'Only assignee, creator, or coordinator can update this task', 
        403
      )
    }

    // Validate status transition
    if (data.status && data.status !== currentTask.status) {
      const allowedTransitions = validTransitions[currentTask.status] || []
      if (!allowedTransitions.includes(data.status)) {
        throw new ApiError(
          'INVALID_TRANSITION',
          `Cannot transition from ${currentTask.status} to ${data.status}. Allowed: ${allowedTransitions.join(', ')}`,
          400
        )
      }
    }

    // Build update data
    const updateData: any = {}
    const statusHistory = [...(currentTask.statusHistory as any[] || [])]

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.estimatedEffort !== undefined) updateData.estimatedEffort = data.estimatedEffort
    if (data.actualEffort !== undefined) updateData.actualEffort = data.actualEffort
    if (data.actualOutputs !== undefined) updateData.actualOutputs = data.actualOutputs
    if (data.retryCount !== undefined) updateData.retryCount = data.retryCount
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }

    // Handle status change
    if (data.status && data.status !== currentTask.status) {
      updateData.status = data.status
      
      statusHistory.push({
        status: data.status,
        timestamp: new Date().toISOString(),
        actor: agent.handle,
        reason: data.blockerReason || 'Status updated',
      })

      // Track timing
      if (data.status === 'RUNNING' && !currentTask.startedAt) {
        updateData.startedAt = new Date()
      }
      if (data.status === 'COMPLETE' && !currentTask.completedAt) {
        updateData.completedAt = new Date()
      }

      // Handle blocker resolution
      if (data.status !== 'BLOCKED' && currentTask.blockerType) {
        updateData.blockerType = null
        updateData.blockerReason = null
        updateData.blockerResolvedAt = new Date()
        updateData.blockerResolution = data.blockerResolution || 'Resolved via status change'
      }

      // Handle new blocker
      if (data.status === 'BLOCKED') {
        if (!data.blockerType) {
          throw new ApiError('MISSING_BLOCKER', 'Blocker type required when setting status to BLOCKED', 400)
        }
        updateData.blockerType = data.blockerType
        updateData.blockerReason = data.blockerReason || 'No reason provided'
      }
    }

    // Handle assignee change
    if (data.assigneeId !== undefined) {
      if (data.assigneeId) {
        const assignee = await prisma.agent.findUnique({
          where: { id: data.assigneeId },
        })
        if (!assignee) {
          throw new ApiError('NOT_FOUND', 'Assignee not found', 404)
        }
        updateData.assigneeId = data.assigneeId
        updateData.assignedAt = new Date()
        
        // Add to history
        statusHistory.push({
          status: currentTask.status,
          timestamp: new Date().toISOString(),
          actor: agent.handle,
          reason: `Assigned to ${assignee.handle}`,
        })
      } else {
        updateData.assigneeId = null
      }
    }

    updateData.statusHistory = statusHistory

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignee: { select: { id: true, handle: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await logAction({
      actorType: ActorType.AGENT,
      actorId: agent.id,
      actorName: agent.handle,
      action: data.status ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED',
      resourceType: 'Task',
      resourceId: params.id,
      beforeState: currentTask as unknown as Record<string, unknown>,
      afterState: updatedTask as unknown as Record<string, unknown>,
      severity: data.status === 'BLOCKED' ? AuditSeverity.WARNING : 
                data.status === 'FAILED' ? AuditSeverity.ERROR : 
                AuditSeverity.INFO,
    })

    // Broadcast event
    broadcastEvent({
      type: 'TASK_UPDATED',
      taskId: updatedTask.id,
      projectId: updatedTask.projectId,
      changes: {
        status: data.status,
        assigneeId: data.assigneeId,
      },
    })

    // Send notifications for important changes
    if (data.status === 'BLOCKED') {
      try {
        await sendToDiscord({
          content: `🚨 Task **#${updatedTask.number}** is blocked!`,
          embeds: [{
            title: updatedTask.title,
            description: data.blockerReason,
            color: 0xef4444,
            fields: [
              { name: 'Type', value: data.blockerType || 'Unknown', inline: true },
              { name: 'Assigned', value: updatedTask.assignee?.handle || 'Unassigned', inline: true },
            ],
          }],
        })
      } catch {
        // Ignore Discord errors
      }
    }

    return successResponse(updatedTask)
  })
)

// DELETE /api/tasks/[id] - Soft delete task
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const apiKey = request.headers.get('x-api-key') || ''
  const agent = await authenticateAgent(apiKey)

  const task = await prisma.task.findFirst({
    where: { id: params.id, isDeleted: false },
  })

  if (!task) {
    throw new ApiError('NOT_FOUND', 'Task not found', 404)
  }

  // Only creator or coordinator can delete
  if (task.creatorId !== agent.id && agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only creator or coordinator can delete', 403)
  }

  // Soft delete
  await prisma.task.update({
    where: { id: params.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  })

  await logAction({
    actorType: ActorType.AGENT,
    actorId: agent.id,
    actorName: agent.handle,
    action: 'TASK_DELETED',
    resourceType: 'Task',
    resourceId: params.id,
    severity: AuditSeverity.WARNING,
  })

  broadcastEvent({
    type: 'TASK_DELETED',
    taskId: params.id,
  })

  return successResponse({ deleted: true })
})
