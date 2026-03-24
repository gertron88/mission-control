/**
 * Portfolio Detail API
 * 
 * GET /api/portfolios/[id] - Get portfolio details
 * PATCH /api/portfolios/[id] - Update portfolio
 * DELETE /api/portfolios/[id] - Archive portfolio
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

interface RouteParams {
  params: { id: string };
}

// GET /api/portfolios/[id]
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = params;
  
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      projects: {
        where: { isArchived: false },
        include: {
          _count: {
            select: { 
              tasks: { where: { status: { not: 'COMPLETE' } } }
            }
          },
          tasks: {
            where: { status: { in: ['BLOCKED', 'FAILED'] } },
            select: { id: true, title: true, status: true, blockerType: true },
            take: 5,
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  if (!portfolio) {
    throw new ApiError('NOT_FOUND', 'Portfolio not found', 404);
  }
  
  // Calculate portfolio health
  const projectStates = portfolio.projects.map(p => p.state);
  const health = {
    totalProjects: portfolio.projects.length,
    proposed: projectStates.filter(s => s === 'PROPOSED').length,
    executing: projectStates.filter(s => s === 'EXECUTING').length,
    blocked: projectStates.filter(s => s === 'BLOCKED').length,
    completed: projectStates.filter(s => s === 'COMPLETED').length,
    totalTasks: portfolio.projects.reduce((sum, p) => sum + p._count.tasks, 0),
    blockedTasks: portfolio.projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'BLOCKED').length, 0),
  };
  
  return successResponse({ 
    portfolio: {
      ...portfolio,
      health
    }
  });
});

// PATCH /api/portfolios/[id]
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = params;
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can update portfolios', 403);
  }
  
  const body = await request.json();
  const { name, description, strategy, budgetTotal, isActive, priorities, capacityRules } = body;
  
  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(strategy !== undefined && { strategy }),
      ...(budgetTotal !== undefined && { budgetTotal }),
      ...(isActive !== undefined && { isActive }),
      ...(priorities !== undefined && { priorities }),
      ...(capacityRules !== undefined && { capacityRules }),
    }
  });
  
  return successResponse({ portfolio });
});

// DELETE /api/portfolios/[id] - Archive (soft delete)
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = params;
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can archive portfolios', 403);
  }
  
  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: { isArchived: true, isActive: false }
  });
  
  return successResponse({ portfolio });
});
