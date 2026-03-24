/**
 * Task Assignment API
 * 
 * POST /api/tasks/[id]/assign - Auto-assign task to best agent
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';
import { DomainError } from '@/types/domain';

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
      const domainError = result.error as DomainError;
      if (domainError.code === 'NOT_FOUND') {
        throw new ApiError('NOT_FOUND', result.error.message, 404);
      }
      throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
    }

    return successResponse(result.value);
  }

  // Auto-assignment using dispatcher
  const recommendResult = await services.dispatch.recommendAgent(params.id);

  if (!recommendResult.ok) {
    const domainError = recommendResult.error as DomainError;
    if (domainError.code === 'NO_ELIGIBLE_AGENTS') {
      throw new ApiError('NO_AGENTS_AVAILABLE', recommendResult.error.message, 422);
    }
    throw new ApiError('INTERNAL_ERROR', recommendResult.error.message, 500);
  }

  // Assign to recommended agent
  if (!recommendResult.value.recommendedAgentId) {
    throw new ApiError('NO_AGENTS_AVAILABLE', 'No eligible agents found for this task', 422);
  }
  
  const assignResult = await services.task.assignTask({
    taskId: params.id,
    agentId: recommendResult.value.recommendedAgentId,
    assignedBy: agent.id,
    assignedByHandle: agent.handle
  });

  if (!assignResult.ok) {
    const domainError = assignResult.error as DomainError;
    if (domainError.code === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', assignResult.error.message, 404);
    }
    throw new ApiError('INTERNAL_ERROR', assignResult.error.message, 500);
  }

  return successResponse(assignResult.value);
});
