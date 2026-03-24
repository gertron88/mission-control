/**
 * Project Dependencies API
 * 
 * GET /api/projects/[id]/dependencies - Get dependency graph
 * POST /api/projects/[id]/resolve - Resolve dependencies
 */

import { NextRequest } from 'next/server';
import { getServices } from '@/services';
import { successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

// GET /api/projects/[id]/dependencies
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const services = getServices();
  
  const result = await services.dependency.getProjectDependencyGraph(params.id);

  if (!result.ok) {
    throw new ApiError('NOT_FOUND', result.error.message, 404);
  }

  return successResponse(result.value);
});

// POST /api/projects/[id]/resolve
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const services = getServices();
  
  const result = await services.dependency.resolveProjectDependencies(params.id);

  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  // Trigger dispatch for newly unblocked tasks
  if (result.value.unblockedTasks.length > 0) {
    await services.dispatch.runDispatchLoop();
  }

  return successResponse({
    unblockedTasks: result.value.unblockedTasks,
    blockedTasks: result.value.blockedTasks,
    cycles: result.value.cycles
  });
});
