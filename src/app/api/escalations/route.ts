/**
 * Escalations API
 * 
 * GET /api/escalations - List active escalations
 * POST /api/escalations/check - Run escalation check on task/project
 */

import { NextRequest } from 'next/server';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic'

// GET /api/escalations - List active escalations
export const GET = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  await authenticateAgent(apiKey);
  
  const services = getServices();
  const result = await services.escalation.getActiveEscalations();
  
  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }
  
  return successResponse({ 
    escalations: result.value,
    count: result.value.length 
  });
});

// POST /api/escalations/check - Run escalation check
export const POST = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const body = await request.json();
  const { taskId, projectId } = body;
  
  if (!taskId && !projectId) {
    throw new ApiError('VALIDATION_ERROR', 'Either taskId or projectId is required', 400);
  }
  
  const services = getServices();
  
  let result;
  if (taskId) {
    result = await services.escalation.checkTask(taskId);
  } else if (projectId) {
    result = await services.escalation.checkProject(projectId);
  }
  
  if (!result!.ok) {
    throw new ApiError('INTERNAL_ERROR', result!.error.message, 500);
  }
  
  return successResponse({
    escalations: result!.value,
    checkedBy: agent.handle,
    checkedAt: new Date().toISOString()
  });
});
