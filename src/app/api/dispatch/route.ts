/**
 * Dispatch API
 * 
 * POST /api/dispatch - Trigger dispatch loop (admin only)
 */

import { NextRequest } from 'next/server';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  // Only coordinators or admins can trigger dispatch
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can trigger dispatch', 403);
  }
  
  const services = getServices();
  
  const result = await services.dispatch.batchDispatch(agent.id);

  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }

  return successResponse({
    dispatched: result.value.stats.assigned,
    assignments: result.value.assignments,
    errors: []
  });
});

/**
 * GET /api/dispatch/status - Get dispatch status
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const services = getServices();
  
  // Get ready tasks count
  const readyTasks = await services.task.listTasks({
    page: 1,
    limit: 1000,
    status: 'READY'
  });

  // Get available agents
  const agents = await services.agent.listAgents({
    status: 'ONLINE',
    hasCapacity: true
  });

  return successResponse({
    readyTasks: readyTasks.ok ? readyTasks.value.tasks.length : 0,
    availableAgents: agents.ok ? agents.value.length : 0,
    timestamp: new Date().toISOString()
  });
});
