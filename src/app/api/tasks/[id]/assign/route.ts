/**
 * Task Assignment API
 * 
 * POST /api/tasks/[id]/assign - Auto-assign task to best agent
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

const assignSchema = z.object({
  agentId: z.string().optional(), // If not provided, auto-assign
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const validated = assignSchema.parse(body);
  
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();

  if (validated.agentId) {
    // Manual assignment to specific agent
    const result = await services.task.assignTask({
      taskId: params.id,
      agentId: validated.agentId,
      assignedBy: agent.id,
      assignedByHandle: agent.handle
    });

    if (!result.ok) {
      if (result.error.code === 'NOT_FOUND') {
        throw new ApiError('NOT_FOUND', result.error.message, 404);
      }
      throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
    }

    return successResponse(result.value);
  }

  // Auto-assignment using dispatcher
  const dispatchResult = await services.dispatch.dispatchSingleTask(params.id);

  if (!dispatchResult.ok) {
    if (dispatchResult.error.code === 'NO_ELIGIBLE_AGENTS') {
      throw new ApiError('NO_AGENTS_AVAILABLE', dispatchResult.error.message, 422);
    }
    throw new ApiError('INTERNAL_ERROR', dispatchResult.error.message, 500);
  }

  return successResponse(dispatchResult.value);
});
