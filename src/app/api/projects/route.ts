import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ActorType, ProjectState, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  portfolioId: z.string(),
  name: z.string().min(1),
  charter: z.string().optional(),
  description: z.string().optional(),
  objectives: z.array(z.object({
    objective: z.string(),
    target: z.string(),
    metric: z.string()
  })).optional(),
  successMetrics: z.record(z.any()).optional(),
  budgetAllocated: z.number().optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
})

// GET /api/projects - List projects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const portfolioId = searchParams.get('portfolioId') || undefined
  const state = searchParams.get('state') as ProjectState | undefined
  
  const projects = await prisma.project.findMany({
    where: {
      ...(portfolioId && { portfolioId }),
      ...(state && { state }),
    },
    include: {
      portfolio: { select: { id: true, name: true } },
      _count: {
        select: {
          tasks: {
            where: { status: { not: 'COMPLETE' } }
          },
          milestones: true
        }
      },
      tasks: {
        where: { status: { in: ['BLOCKED', 'FAILED'] } },
        select: { id: true, number: true, title: true, status: true, blockerType: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  
  return NextResponse.json(projects)
}

// POST /api/projects - Create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createProjectSchema.parse(body)
    
    const actorId = body.actorId || 'system'
    const actorName = body.actorName || 'System'
    
    const project = await prisma.project.create({
      data: {
        portfolioId: data.portfolioId,
        name: data.name,
        charter: data.charter,
        description: data.description,
        objectives: data.objectives,
        successMetrics: data.successMetrics,
        budgetAllocated: data.budgetAllocated,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined,
        state: 'PROPOSED',
        stateHistory: [{
          state: 'PROPOSED',
          timestamp: new Date().toISOString(),
          reason: 'Project created'
        }]
      },
      include: {
        portfolio: { select: { id: true, name: true } }
      }
    })
    
    await logAction({
      actorType: ActorType.AGENT,
      actorId,
      actorName,
      action: 'PROJECT_CREATED',
      resourceType: 'Project',
      resourceId: project.id,
      afterState: project as unknown as Record<string, unknown>,
    })
    
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
