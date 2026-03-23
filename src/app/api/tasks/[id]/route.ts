import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { sendToDiscord, createTaskEmbed } from '@/lib/discord'
import { ActorType, TaskStatus, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED']).optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  actualHours: z.number().nullable().optional(),
})

// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, handle: true, name: true, avatar: true, status: true } },
      creator: { select: { id: true, handle: true, name: true } },
      parent: { select: { id: true, number: true, title: true } },
      subtasks: {
        select: { id: true, number: true, title: true, status: true, priority: true },
      },
      dependencies: { select: { id: true, number: true, title: true, status: true } },
      dependents: { select: { id: true, number: true, title: true, status: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { task: false },
      },
      attachments: true,
    },
  })
  
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  return NextResponse.json(task)
}

// PATCH /api/tasks/[id] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateTaskSchema.parse(body)
    const actorId = body.actorId || 'system'
    const actorName = body.actorName || 'System'
    
    // Get current state for audit
    const currentTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { assignee: { select: { handle: true } } },
    })
    
    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    
    // Track status change timestamps
    if (data.status === 'IN_PROGRESS' && currentTask.status !== 'IN_PROGRESS') {
      updateData.startedAt = new Date()
    }
    if (data.status === 'DONE' && currentTask.status !== 'DONE') {
      updateData.completedAt = new Date()
    }
    
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignee: { select: { id: true, handle: true, name: true } },
      },
    })
    
    // Audit log
    await logAction({
      actorType: ActorType.AGENT,
      actorId,
      actorName,
      action: `TASK_${data.status ? 'STATUS_CHANGED' : 'UPDATED'}`,
      resourceType: 'Task',
      resourceId: params.id,
      beforeState: currentTask as unknown as Record<string, unknown>,
      afterState: updatedTask as unknown as Record<string, unknown>,
      severity: data.status === 'BLOCKED' ? AuditSeverity.WARNING : AuditSeverity.INFO,
    })
    
    // Discord notification for status changes
    if (data.status && data.status !== currentTask.status) {
      const statusEmojis: Record<TaskStatus, string> = {
        BACKLOG: '📋',
        TODO: '🎯',
        IN_PROGRESS: '🏃',
        IN_REVIEW: '👀',
        DONE: '✅',
        BLOCKED: '🚫',
        CANCELLED: '❌',
      }
      
      const taskUrl = `${process.env.NEXTAUTH_URL}/tasks/${params.id}`
      await sendToDiscord({
        content: `${statusEmojis[data.status]} TASK-#${updatedTask.number} moved to **${data.status}**` +
          (updatedTask.assignee ? ` — ${updatedTask.assignee.handle}` : ''),
        embeds: [createTaskEmbed({
          number: updatedTask.number,
          title: updatedTask.title,
          status: updatedTask.status,
          priority: updatedTask.priority,
          assignee: updatedTask.assignee,
          url: taskUrl,
        })],
      })
    }
    
    return NextResponse.json(updatedTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to update task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const actorId = body.actorId || 'system'
    const actorName = body.actorName || 'System'
    
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    await prisma.task.delete({
      where: { id: params.id },
    })
    
    await logAction({
      actorType: ActorType.AGENT,
      actorId,
      actorName,
      action: 'TASK_DELETED',
      resourceType: 'Task',
      resourceId: params.id,
      beforeState: task as unknown as Record<string, unknown>,
      severity: AuditSeverity.WARNING,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
