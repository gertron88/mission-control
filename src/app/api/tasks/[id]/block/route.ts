/**
 * Task Blocker API
 * 
 * POST /api/tasks/[id]/block   - Block a task
 * POST /api/tasks/[id]/unblock - Unblock a task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';
import { BlockerType } from '@prisma/client';
import { DomainError } from '@/types/domain';

const blockSchema = z.object({
  blockerType: z.nativeEnum(BlockerType),
  reason: z.string().min(1),
});

const unblockSchema = z.object({
  resolution: z.string().min(1),
});

// POST /api/tasks/[id]/block
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const validated = blockSchema.parse(body);
  
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const services = getServices();

  const result = await services.task.blockTask({
    taskId: params.id,
    blockerType: validated.blockerType,
    reason: validated.reason,
    blockedBy: agent.id,
    blockedByHandle: agent.handle
  });

  if (!result.ok) {
    const domainError = result.error as DomainError;
    if (domainError.code === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', result.error.message, 404);
    }
    if (domainError.code === 'STATE_TRANSITION_ERROR') {
      throw new ApiError('INVALID_STATE', result.error.message, 409);
    }
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse(result.value);
});
