/**
 * Individual Task API
 * 
 * GET    /api/tasks/[id] - Get task details
 * PATCH  /api/tasks/[id] - Update task (status, assignment, etc.)
 * DELETE /api/tasks/[id] - Soft delete task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';
import { TaskStatus, TaskPriority } from '@prisma/client';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedEffort: z.number().min(0).optional(),
  actualEffort: z.number().min(0).optional(),
  actualOutputs: z.record(z.any()).optional(),
  reason: z.string().optional(), // For status transitions
});

// GET /api/tasks/[id]
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const services = getServices();
  const result = await services.task.getTask(params.id);

  if (!result.ok) {
    throw new ApiError('NOT_FOUND', 'Task not found', 404);
  }

  return successResponse(result.value);
});

// PATCH /api/tasks/[id]
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const validated = updateTaskSchema.parse(body);
  
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();

  // Handle status transition separately if status is being updated
  if (validated.status) {
    const transitionResult = await services.task.transitionStatus({
      taskId: params.id,
      newStatus: validated.status,
      reason: validated.reason,
      actorId: agent.id,
      actorHandle: agent.handle
    });

    if (!transitionResult.ok) {
      const error = transitionResult.error;
      if (error.code === 'STATE_TRANSITION_ERROR') {
        throw new ApiError('INVALID_TRANSITION', error.message, 409);
      }
      if (error.code === 'NOT_FOUND') {
        throw new ApiError('NOT_FOUND', error.message, 404);
      }
      throw new ApiError('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse(transitionResult.value);
  }

  // Regular update (no status change)
  const updateResult = await services.task.updateTask(params.id, {
    title: validated.title,
    description: validated.description,
    priority: validated.priority,
    assigneeId: validated.assigneeId,
    dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
    estimatedEffort: validated.estimatedEffort,
    actualEffort: validated.actualEffort,
    actualOutputs: validated.actualOutputs
  });

  if (!updateResult.ok) {
    throw new ApiError('INTERNAL_ERROR', updateResult.error.message, 500);
  }

  return successResponse(updateResult.value);
});

// DELETE /api/tasks/[id] - Soft delete
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();
  
  const result = await services.task.deleteTask(params.id, {
    deletedBy: agent.id,
    deletedByHandle: agent.handle
  });

  if (!result.ok) {
    throw new ApiError('NOT_FOUND', 'Task not found', 404);
  }

  return successResponse({ deleted: true });
});
