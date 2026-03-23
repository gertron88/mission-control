import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { createRouteHandler } from '@/lib/auth'
import { sendToDiscord, createTaskEmbed } from '@/lib/discord'
import { ActorType, TaskStatus, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  assigneeId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  type: z.enum(['FEATURE', 'BUG', 'TRADING_STRATEGY', 'INFRASTRUCTURE', 'SECURITY', 'RESEARCH', 'DOCUMENTATION', 'DEPLOYMENT']),
  project: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().optional(),
  parentId: z.string().optional(),
})

// GET /api/tasks - List tasks (public read, protected write)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status') as TaskStatus | undefined
  const assigneeId = searchParams.get('assigneeId') || undefined
  const project = searchParams.get('project') || undefined
  
  const tasks = await prisma.task.findMany({
    where: {
      ...(status && { status }),
      ...(assigneeId && { assigneeId }),
      ...(project && { project }),
    },
    include: {
      assignee: { select: { id: true, handle: true, name: true, avatar: true } },
      creator: { select: { id: true, handle: true, name: true } },
      subtasks: { select: { id: true, status: true } },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })
  
  return NextResponse.json(tasks)
}

// POST /api/tasks - Create task (protected)
async function createTaskHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createTaskSchema.parse(body)
    
    // Get creator from authenticated agent or user
    const actor = (request as any).agent || (request as any).user
    const creatorId = actor?.id || 'system'
    
    const task = await prisma.task.create({
      data: {
        ...data,
        creatorId,
        status: 'BACKLOG',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, handle: true, name: true } },
        creator: { select: { id: true, handle: true, name: true } },
      },
    })
    
    // Audit log
    await logAction({
      actorType: ActorType.AGENT,
      actorId: creatorId,
      actorName: task.creator.name,
      action: 'TASK_CREATED',
      resourceType: 'Task',
      resourceId: task.id,
      afterState: task as unknown as Record<string, unknown>,
    })
    
    // Notify Discord
    const taskUrl = `${process.env.NEXTAUTH_URL}/tasks/${task.id}`
    await sendToDiscord({
      content: task.assignee ? `🎯 New task assigned to ${task.assignee.handle}` : '🎯 New task created',
      embeds: [createTaskEmbed({
        number: task.number,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        url: taskUrl,
      })],
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to create task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

export const POST = createRouteHandler(createTaskHandler, {
  allowAgent: true,
  allowHuman: true,
  rateLimitMax: 100
})
