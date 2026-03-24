/**
 * Task Unblock API
 * 
 * POST /api/tasks/[id]/unblock - Unblock a task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

const unblockSchema = z.object({
  resolution: z.string().min(1),
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const validated = unblockSchema.parse(body);
  
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();

  const result = await services.task.unblockTask({
    taskId: params.id,
    resolution: validated.resolution,
    unblockedBy: agent.id,
    unblockedByHandle: agent.handle
  });

  if (!result.ok) {
    if (result.error.code === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', result.error.message, 404);
    }
    if (result.error.code === 'STATE_TRANSITION_ERROR') {
      throw new ApiError('INVALID_STATE', result.error.message, 409);
    }
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse(result.value);
});
