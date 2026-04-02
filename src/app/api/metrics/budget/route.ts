/**
 * Budget Usage API
 * GET /api/metrics/budget - Returns budget consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all projects to calculate total budget
    const projects = await prisma.project.findMany({
      where: { isArchived: false }
    });

    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budgetAllocated) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.budgetSpent) || 0), 0);

    // For now, return placeholder percentages
    // In production, this would track actual API calls, compute hours, etc.
    const apiCreditsUsed = Math.min(100, (totalSpent / totalBudget) * 100 * 0.6) || 0;
    const computeUsed = Math.min(100, (totalSpent / totalBudget) * 100 * 0.4) || 0;
    const storageUsed = Math.min(100, (totalSpent / totalBudget) * 100 * 0.2) || 0;

    return NextResponse.json({
      apiCredits: {
        used: Math.round(apiCreditsUsed),
        limit: 100
      },
      compute: {
        used: Math.round(computeUsed),
        limit: 100
      },
      storage: {
        used: Math.round(storageUsed),
        limit: 100
      },
      totalSpent,
      totalBudget,
      period: 'month'
    });
  } catch (error) {
    console.error('Failed to fetch budget:', error);
    return NextResponse.json({
      apiCredits: { used: 0, limit: 100 },
      compute: { used: 0, limit: 100 },
      storage: { used: 0, limit: 100 },
      totalSpent: 0,
      totalBudget: 0,
      period: 'month'
    });
  }
}
