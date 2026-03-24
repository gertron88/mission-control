/**
 * Portfolio API Routes
 * 
 * GET /api/portfolios - List all portfolios
 * POST /api/portfolios - Create new portfolio
 * GET /api/portfolios/[id] - Get portfolio details
 * PATCH /api/portfolios/[id] - Update portfolio
 * DELETE /api/portfolios/[id] - Archive portfolio
 * GET /api/portfolios/[id]/metrics - Portfolio-level metrics
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

// GET /api/portfolios - List portfolios
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('archived') === 'true';
  
  const portfolios = await prisma.portfolio.findMany({
    where: includeArchived ? {} : { isArchived: false },
    include: {
      _count: {
        select: { 
          projects: { where: { isArchived: false } }
        }
      },
      projects: {
        where: { isArchived: false },
        select: {
          id: true,
          state: true,
          budgetAllocated: true,
          budgetSpent: true,
        },
        take: 100, // Limit for performance
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Calculate aggregate metrics
  const portfoliosWithMetrics = portfolios.map(p => {
    const activeProjects = p.projects.filter(proj => proj.state === 'EXECUTING').length;
    const totalBudget = p.projects.reduce((sum, proj) => sum + Number(proj.budgetAllocated || 0), 0);
    const spentBudget = p.projects.reduce((sum, proj) => sum + Number(proj.budgetSpent || 0), 0);
    
    return {
      ...p,
      metrics: {
        activeProjects,
        totalProjects: p._count.projects,
        budgetUtilization: totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0,
        atRiskProjects: p.projects.filter(proj => proj.state === 'BLOCKED').length,
      }
    };
  });
  
  return successResponse({ portfolios: portfoliosWithMetrics });
});

// POST /api/portfolios - Create portfolio
export const POST = withErrorHandler(async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  if (agent.role !== 'COORDINATOR') {
    throw new ApiError('FORBIDDEN', 'Only coordinators can create portfolios', 403);
  }
  
  const body = await request.json();
  const { name, slug, description, strategy, budgetTotal, priorities, capacityRules } = body;
  
  if (!name || !slug) {
    throw new ApiError('VALIDATION_ERROR', 'Name and slug are required', 400);
  }
  
  // Check for duplicate slug
  const existing = await prisma.portfolio.findUnique({
    where: { slug }
  });
  
  if (existing) {
    throw new ApiError('CONFLICT', `Portfolio with slug '${slug}' already exists`, 409);
  }
  
  const portfolio = await prisma.portfolio.create({
    data: {
      name,
      slug,
      description,
      strategy,
      budgetTotal,
      priorities: priorities || {},
      capacityRules: capacityRules || {},
      createdBy: agent.id,
    }
  });
  
  return successResponse({ portfolio }, 201);
});
