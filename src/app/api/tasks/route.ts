import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { sendToDiscord, createTaskEmbed } from '@/lib/discord'
import { broadcastEvent } from '@/lib/events'
import { 
  withErrorHandler, 
  withValidation, 
  successResponse,
  getPaginationParams,
  authenticateAgent,
  ApiError,
  checkRateLimit
} from '@/lib/api-utils'
import { ActorType, TaskStatus, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  milestoneId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  type: z.enum([
    'FEATURE', 'BUG', 'TRADING_STRATEGY', 'INFRASTRUCTURE', 
    'SECURITY', 'RESEARCH', 'DOCUMENTATION', 'DEPLOYMENT',
    'ANALYSIS', 'COORDINATION', 'TESTING', 'CODE_REVIEW'
  ]),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedEffort: z.number().min(0).optional(),
  dependencies: z.array(z.string()).optional(),
  requiredTools: z.array(z.string()).optional(),
  outputs: z.record(z.any()).optional(),
  validationCriteria: z.record(z.any()).optional(),
})

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
  actualOutputs: z.record(z.any()).optional(),
}).passthrough() // Allow additional fields like actorId

// GET /api/tasks - List tasks with filtering and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = getPaginationParams(request)
  
  // Build filter
  const where: any = { isDeleted: false }
  
  const status = searchParams.get('status')
  if (status) where.status = status
  
  const projectId = searchParams.get('projectId')
  if (projectId) where.projectId = projectId
  
  const assigneeId = searchParams.get('assigneeId')
  if (assigneeId) where.assigneeId = assigneeId
  
  const milestoneId = searchParams.get('milestoneId')
  if (milestoneId) where.milestoneId = milestoneId
  
  const priority = searchParams.get('priority')
  if (priority) where.priority = priority
  
  const type = searchParams.get('type')
  if (type) where.type = type
  
  const blockerType = searchParams.get('blockerType')
  if (blockerType) where.blockerType = blockerType
  
  // Overdue tasks
  const overdue = searchParams.get('overdue')
  if (overdue === 'true') {
    where.dueDate = { lt: new Date() }
    where.status = { notIn: ['COMPLETE', 'CANCELED'] }
  }
  
  // Search
  const search = searchParams.get('search')
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Get total count
  const total = await prisma.task.count({ where })
  
  // Get tasks
  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { 
        select: { id: true, handle: true, name: true, avatar: true, status: true } 
      },
      creator: { 
        select: { id: true, handle: true, name: true } 
      },
      project: {
        select: { id: true, name: true, slug: true }
      },
      milestone: {
        select: { id: true, name: true }
      },
      subtasks: { select: { id: true, status: true, title: true } },
      _count: { select: { comments: true, attachments: true, timeLogs: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
    skip,
    take: limit,
  })

  return successResponse(tasks, 200, {
    page,
    limit,
    total,
    hasMore: skip + tasks.length < total,
  })
})

// POST /api/tasks - Create new task
export const POST = withErrorHandler(
  withValidation(createTaskSchema, async (data, request) => {
    // Rate limiting
    const apiKey = request.headers.get('x-api-key') || ''
    const rateLimit = await checkRateLimit(`create-task:${apiKey}`, 30, 60000)
    if (!rateLimit.allowed) {
      throw new ApiError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s`,
        429
      )
    }

    // Authenticate
    const agent = await authenticateAgent(apiKey)
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    })
    if (!project) {
      throw new ApiError('NOT_FOUND', 'Project not found', 404)
    }

    // If milestone specified, verify it belongs to project
    if (data.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: data.milestoneId, projectId: data.projectId },
      })
      if (!milestone) {
        throw new ApiError('NOT_FOUND', 'Milestone not found in this project', 404)
      }
    }

    // If assignee specified, verify agent exists
    if (data.assigneeId) {
      const assignee = await prisma.agent.findUnique({
        where: { id: data.assigneeId },
      })
      if (!assignee) {
        throw new ApiError('NOT_FOUND', 'Assignee not found', 404)
      }
    }

    // Create task with initial status history
    const task = await prisma.task.create({
      data: {
        ...data,
        creatorId: agent.id,
        status: 'QUEUED',
        statusHistory: [{
          status: 'QUEUED',
          timestamp: new Date().toISOString(),
          actor: agent.handle,
          reason: 'Task created',
        }],
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, handle: true, name: true } },
        creator: { select: { id: true, handle: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await logAction({
      actorType: ActorType.AGENT,
      actorId: agent.id,
      actorName: agent.handle,
      action: 'TASK_CREATED',
      resourceType: 'Task',
      resourceId: task.id,
      afterState: task as unknown as Record<string, unknown>,
    })

    // Broadcast event
    broadcastEvent({
      type: 'TASK_CREATED',
      taskId: task.id,
      projectId: task.projectId,
      data: task,
    })

    // Notify Discord
    try {
      const taskUrl = `${process.env.NEXTAUTH_URL}/tasks/${task.id}`
      await sendToDiscord({
        content: task.assignee 
          ? `🎯 New task assigned to ${task.assignee.handle}` 
          : '🎯 New task created',
        embeds: [createTaskEmbed({
          number: task.number,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          url: taskUrl,
        })],
      })
    } catch {
      // Discord notification failure shouldn't fail the request
    }

    return successResponse(task, 201)
  })
)
