/**
 * Task Creation API
 * 
 * POST /api/tasks/create - Create new task (for agent use)
 * Allows agents to create tasks for themselves or others
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent } from '@/lib/api-utils';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the agent making the request
    const apiKey = request.headers.get('x-api-key') || '';
    const agent = await authenticateAgent(apiKey);
    
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.projectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, projectId' 
      }, { status: 400 });
    }

    // Get next task number for this project
    const lastTask = await prisma.task.findFirst({
      where: { projectId: body.projectId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = (lastTask?.number || 0) + 1;

    // Create the task
    const task = await prisma.task.create({
      data: {
        projectId: body.projectId,
        number: nextNumber,
        title: body.title,
        description: body.description || '',
        type: body.type || 'FEATURE',
        status: body.status || 'QUEUED',
        priority: body.priority || 'MEDIUM',
        assigneeId: body.assigneeId || agent.id, // Default to self
        estimatedEffort: body.estimatedEffort || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, handle: true } },
      },
    });

    // Log the task creation
    await prisma.auditLog.create({
      data: {
        actorType: 'AGENT',
        actorId: agent.id,
        actorName: agent.name,
        action: 'TASK_CREATED',
        resourceType: 'Task',
        resourceId: task.id,
        afterState: task as unknown as Record<string, unknown>,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' }, 
      { status: 500 }
    );
  }
}
