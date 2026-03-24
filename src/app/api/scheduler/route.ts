/**
 * Scheduler API
 * 
 * GET /api/scheduler/status - Get scheduler status
 * POST /api/scheduler/start - Start control loops
 * POST /api/scheduler/stop - Stop control loops
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createScheduler, getScheduler } from '@/core/scheduler/control-loop';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

// GET /api/scheduler/status
export const GET = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  await authenticateAgent(apiKey);
  
  const scheduler = getScheduler();
  
  if (!scheduler) {
    return successResponse({
      status: 'stopped',
      loops: null
    });
  }
  
  return successResponse({
    status: 'running',
    loops: scheduler.getStatus()
  });
});

// POST /api/scheduler/start
export const POST = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can start the scheduler', 403);
  }
  
  const scheduler = createScheduler({ prisma });
  scheduler.start();
  
  return successResponse({
    status: 'started',
    loops: scheduler.getStatus()
  });
});
