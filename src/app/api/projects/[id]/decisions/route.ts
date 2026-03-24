/**
 * Decision API Routes
 * 
 * GET /api/projects/[id]/decisions - List project decisions
 * POST /api/projects/[id]/decisions - Create new decision
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, successResponse, ApiError, withErrorHandler } from '@/lib/api-utils';

interface RouteParams {
  params: { id: string };
}

// GET /api/projects/[id]/decisions
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id: projectId } = params;
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | undefined;
  
  const decisions = await prisma.decision.findMany({
    where: {
      projectId,
      ...(status && { status })
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return successResponse({ decisions });
});

// POST /api/projects/[id]/decisions
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id: projectId } = params;
  const apiKey = request.headers.get('x-api-key') || '';
  const agent = await authenticateAgent(apiKey);
  
  const body = await request.json();
  const { title, description, rationale, requiredApprovals, relatedTaskIds, tags } = body;
  
  if (!title || !description || !rationale) {
    throw new ApiError('VALIDATION_ERROR', 'Title, description, and rationale are required', 400);
  }
  
  const decision = await prisma.decision.create({
    data: {
      projectId,
      title,
      description,
      rationale,
      authorType: 'AGENT',
      authorId: agent.id,
      authorName: agent.handle,
      requiredApprovals: requiredApprovals || 0,
      currentApprovals: 0,
      approvals: [],
      relatedTaskIds: relatedTaskIds || [],
      tags: tags || [],
      state: 'PROPOSED'
    }
  });
  
  return successResponse({ decision }, 201);
});
