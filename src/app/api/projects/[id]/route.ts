import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ActorType, ProjectState, AuditSeverity } from '@prisma/client'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  charter: z.string().optional(),
  description: z.string().optional(),
  state: z.nativeEnum(ProjectState).optional(),
  objectives: z.array(z.any()).optional(),
  budgetAllocated: z.number().optional(),
  actualStart: z.string().datetime().optional(),
  actualEnd: z.string().datetime().optional(),
  stateChangeReason: z.string().optional(),
})

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      portfolio: { select: { id: true, name: true } },
      milestones: {
        orderBy: { sequence: 'asc' },
        include: {
          _count: {
            select: {
              tasks: {
                where: { status: { not: 'COMPLETE' } }
              }
            }
          }
        }
      },
      tasks: {
        where: { parentId: null }, // Top-level tasks only
        include: {
          assignee: { select: { id: true, handle: true, name: true, avatar: true } },
          subtasks: { select: { id: true, status: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      },
      decisions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      risks: {
        orderBy: { score: 'desc' }
      },
      artifacts: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      _count: {
        select: {
          tasks: true,
          milestones: true
        }
      }
    }
  })
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  
  return NextResponse.json(project)
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateProjectSchema.parse(body)
    const actorId = body.actorId || 'system'
    const actorName = body.actorName || 'System'
    
    // Get current state for audit
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id }
    })
    
    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.charter !== undefined) updateData.charter = data.charter
    if (data.description !== undefined) updateData.description = data.description
    if (data.objectives !== undefined) updateData.objectives = data.objectives
    if (data.budgetAllocated !== undefined) updateData.budgetAllocated = data.budgetAllocated
    if (data.actualStart !== undefined) updateData.actualStart = new Date(data.actualStart)
    if (data.actualEnd !== undefined) updateData.actualEnd = new Date(data.actualEnd)
    
    // Handle state change with history
    if (data.state && data.state !== currentProject.state) {
      updateData.state = data.state
      
      const stateHistory = (currentProject.stateHistory as Array<Record<string, unknown>>) || []
      stateHistory.push({
        state: data.state,
        timestamp: new Date().toISOString(),
        reason: data.stateChangeReason || 'State updated via API'
      })
      updateData.stateHistory = stateHistory
      
      // Auto-set actual dates on certain state transitions
      if (data.state === 'EXECUTING' && !currentProject.actualStart) {
        updateData.actualStart = new Date()
      }
      if ((data.state === 'COMPLETED' || data.state === 'FAILED') && !currentProject.actualEnd) {
        updateData.actualEnd = new Date()
      }
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        portfolio: { select: { id: true, name: true } }
      }
    })
    
    // Audit log
    await logAction({
      actorType: ActorType.AGENT,
      actorId,
      actorName,
      action: data.state ? 'PROJECT_STATE_CHANGED' : 'PROJECT_UPDATED',
      resourceType: 'Project',
      resourceId: params.id,
      beforeState: currentProject as unknown as Record<string, unknown>,
      afterState: updatedProject as unknown as Record<string, unknown>,
      severity: data.state === 'FAILED' || data.state === 'ROLLBACK' ? AuditSeverity.ERROR : AuditSeverity.INFO,
    })
    
    return NextResponse.json(updatedProject)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to update project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
