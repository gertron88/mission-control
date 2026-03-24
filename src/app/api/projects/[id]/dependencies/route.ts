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
  
  const result = await services.dependency.buildDependencyGraph(params.id);

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
  
  const result = await services.dependency.resolveDependencies({ projectId: params.id });

  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse({
    resolved: result.value.resolved,
    stillBlocked: result.value.stillBlocked,
    cycles: result.value.cycles
  });
});