'use server'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats() {
  const [projects, tasks, agents] = await Promise.all([
    prisma.project.findMany({
      where: { isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.task.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        assignee: true,
        project: true,
      },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    }),
  ])

  return {
    projects,
    tasks,
    agents,
    stats: {
      totalProjects: await prisma.project.count({ where: { isArchived: false } }),
      activeProjects: await prisma.project.count({ where: { state: 'EXECUTING', isArchived: false } }),
      totalTasks: await prisma.task.count({ where: { isDeleted: false } }),
      runningTasks: await prisma.task.count({ where: { status: 'RUNNING', isDeleted: false } }),
      totalAgents: await prisma.agent.count({ where: { isActive: true } }),
      onlineAgents: await prisma.agent.count({ where: { status: 'ONLINE', isActive: true } }),
    }
  }
}