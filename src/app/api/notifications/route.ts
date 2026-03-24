/**
 * Notifications API
 * 
 * GET /api/notifications - List notifications for current agent
 * POST /api/notifications - Send notification
 * PATCH /api/notifications/[id] - Mark as read
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServices } from '@/services';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

// GET /api/notifications
export const GET = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const services = getServices();
  const result = await services.notification.getNotifications(agent.id, {
    unreadOnly,
    limit
  });
  
  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }
  
  return successResponse({ notifications: result.value });
});

// POST /api/notifications
export const POST = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can send notifications', 403);
  }
  
  const body = await request.json();
  const { recipientType, recipientId, type, title, message, channel, taskId, projectId } = body;
  
  if (!recipientId || !type || !title || !message) {
    throw new ApiError('VALIDATION_ERROR', 'recipientId, type, title, and message are required', 400);
  }
  
  const services = getServices();
  const result = await services.notification.send({
    recipientType: recipientType || 'AGENT',
    recipientId,
    type,
    title,
    message,
    channel: channel || 'in_app',
    taskId,
    projectId
  });
  
  if (!result.ok) {
    throw new ApiError('INTERNAL_ERROR', result.error.message, 500);
  }
  
  return successResponse({ result: result.value }, 201);
});
