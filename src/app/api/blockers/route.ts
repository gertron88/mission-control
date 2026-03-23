import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/blockers - Get all blocked tasks across projects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const projectId = searchParams.get('projectId') || undefined
  const blockerType = searchParams.get('type') || undefined
  
  const blockedTasks = await prisma.task.findMany({
    where: {
      status: 'BLOCKED',
      ...(projectId && { projectId }),
      ...(blockerType && { blockerType }),
    },
    include: {
      project: { select: { id: true, name: true, state: true } },
      assignee: { select: { id: true, handle: true, name: true } },
      milestone: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { updatedAt: 'desc' }
    ],
  })
  
  // Group by blocker type for analytics
  const grouped = blockedTasks.reduce((acc, task) => {
    const type = task.blockerType || 'UNKNOWN'
    if (!acc[type]) acc[type] = []
    acc[type].push(task)
    return acc
  }, {} as Record<string, typeof blockedTasks>)
  
  return NextResponse.json({
    tasks: blockedTasks,
    grouped,
    total: blockedTasks.length,
    byType: Object.keys(grouped).map(type => ({
      type,
      count: grouped[type].length
    }))
  })
}

// POST /api/blockers/resolve - Attempt to resolve blockers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, resolution, actorId, actorName } = body
    
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    if (task.status !== 'BLOCKED') {
      return NextResponse.json({ error: 'Task is not blocked' }, { status: 400 })
    }
    
    // Update task based on resolution type
    const updateData: Record<string, unknown> = {}
    
    switch (resolution) {
      case 'DEPENDENCY_MET':
        // Check if dependencies are actually complete
        const dependencies = await prisma.task.findMany({
          where: { id: { in: task.dependencies } }
        })
        const allComplete = dependencies.every(d => d.status === 'COMPLETE')
        
        if (allComplete) {
          updateData.status = 'READY'
          updateData.blockerType = null
          updateData.blockerReason = null
          updateData.blockerResolvedAt = new Date()
        } else {
          return NextResponse.json({ 
            error: 'Dependencies not complete',
            dependencies: dependencies.map(d => ({ id: d.id, status: d.status }))
          }, { status: 400 })
        }
        break
        
      case 'APPROVAL_GRANTED':
        updateData.status = 'READY'
        updateData.blockerType = null
        updateData.blockerReason = null
        updateData.blockerResolvedAt = new Date()
        break
        
      case 'CREDENTIALS_PROVIDED':
        updateData.status = 'READY'
        updateData.blockerType = null
        updateData.blockerReason = null
        updateData.blockerResolvedAt = new Date()
        break
        
      case 'RETRY':
        updateData.status = 'QUEUED'
        updateData.retryCount = { increment: 1 }
        updateData.blockerType = null
        updateData.blockerReason = null
        updateData.blockerResolvedAt = new Date()
        break
        
      case 'REASSIGN':
        updateData.status = 'QUEUED'
        updateData.assigneeId = null // Clear assignee for re-assignment
        updateData.blockerType = null
        updateData.blockerReason = null
        updateData.blockerResolvedAt = new Date()
        break
        
      default:
        return NextResponse.json({ error: 'Unknown resolution type' }, { status: 400 })
    }
    
    // Add to status history
    const statusHistory = (task.statusHistory as Array<Record<string, unknown>>) || []
    statusHistory.push({
      status: updateData.status,
      timestamp: new Date().toISOString(),
      actor: actorName || 'System',
      reason: `Blocker resolved: ${resolution}`
    })
    updateData.statusHistory = statusHistory
    
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, handle: true, name: true } },
      }
    })
    
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Failed to resolve blocker:', error)
    return NextResponse.json({ error: 'Failed to resolve blocker' }, { status: 500 })
  }
}
