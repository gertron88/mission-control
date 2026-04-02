import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [agentCount, projectCount, taskCount] = await Promise.all([
      prisma.agent.count(),
      prisma.project.count(),
      prisma.task.count(),
    ])

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      counts: {
        agents: agentCount,
        projects: projectCount,
        tasks: taskCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
