/**
 * Tasks API - Service Layer Integration
 * 
 * POST   /api/tasks         - Create task
 * GET    /api/tasks         - List tasks (with filters)
 * GET    /api/tasks/[id]    - Get task details
 * PATCH  /api/tasks/[id]    - Update task (uses state machine)
 * DELETE /api/tasks/[id]    - Soft delete task
 * POST   /api/tasks/[id]/assign - Auto-assign task
 * POST   /api/tasks/[id]/block  - Block task
 * POST   /api/tasks/[id]/unblock - Unblock task
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  projectId: z.string().min(1),
  milestoneId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  type: z.nativeEnum(TaskType),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedEffort: z.number().min(0).optional(),
  dependencies: z.array(z.string()).optional(),
  requiredTools: z.array(z.string()).optional(),
  outputs: z.record(z.any()).optional(),
  validationCriteria: z.record(z.any()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedEffort: z.number().min(0).optional(),
  actualEffort: z.number().min(0).optional(),
  blockerType: z.string().nullable().optional(),
  blockerReason: z.string().nullable().optional(),
  actualOutputs: z.record(z.any()).optional(),
});

// ============================================================================
// GET /api/tasks - List tasks with filtering
// ============================================================================

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Build filters
  const filters: Record<string, unknown> = {};
  
  const status = searchParams.get('status');
  if (status) filters.status = status;
  
  const projectId = searchParams.get('projectId');
  if (projectId) filters.projectId = projectId;
  
  const assigneeId = searchParams.get('assigneeId');
  if (assigneeId) filters.assigneeId = assigneeId;
  
  const priority = searchParams.get('priority');
  if (priority) filters.priority = priority;
  
  const type = searchParams.get('type');
  if (type) filters.type = type;
  
  const overdue = searchParams.get('overdue') === 'true';
  
  const search = searchParams.get('search');
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const services = getServices();
  const result = await services.task.listTasks({
    filters,
    overdue,
    search,
    page,
    limit
  });

  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse(result.value.tasks, 200, {
    page,
    limit,
    total: result.value.total,
    hasMore: result.value.hasMore
  });
});

// ============================================================================
// POST /api/tasks - Create new task
// ============================================================================

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validated = createTaskSchema.parse(body);
  
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();
  
  const result = await services.task.createTask({
    ...validated,
    dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
    creatorId: agent.id,
    creatorHandle: agent.handle
  });

  if (!result.ok) {
    if (result.error.code === 'VALIDATION_ERROR') {
      throw new ApiError('VALIDATION_ERROR', result.error.message, 400);
    }
    if (result.error.code === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', result.error.message, 404);
    }
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse(result.value, 201);
});
