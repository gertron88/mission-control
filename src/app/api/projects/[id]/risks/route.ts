/**
 * Risk API Routes
 * 
 * GET /api/projects/[id]/risks - List project risks
 * POST /api/projects/[id]/risks - Create new risk
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

interface RouteParams {
  params: { id: string };
}

// GET /api/projects/[id]/risks
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id: projectId } = params;
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as string | undefined;
  
  const risks = await prisma.risk.findMany({
    where: {
      projectId,
      ...(status && { status })
    },
    orderBy: [
      { score: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  
  return successResponse({ risks });
});

// POST /api/projects/[id]/risks
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id: projectId } = params;
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const body = await request.json();
  const { title, description, category, likelihood, impact, mitigation, contingency, owner } = body;
  
  if (!title || !description || !likelihood || !impact) {
    throw new ApiError('VALIDATION_ERROR', 'Title, description, likelihood, and impact are required', 400);
  }
  
  // Calculate risk score (likelihood * impact)
  const likelihoodValues: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const impactValues: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const score = (likelihoodValues[likelihood] || 1) * (impactValues[impact] || 1);
  
  const risk = await prisma.risk.create({
    data: {
      projectId,
      title,
      description,
      category: category || 'TECHNICAL',
      likelihood,
      impact,
      score,
      mitigation,
      contingency,
      owner: owner || agent.id
    }
  });
  
  return successResponse({ risk }, 201);
});
