import { prisma } from '@/lib/prisma'
import { AuditSeverity, ActorType } from '@prisma/client'

interface AuditLogInput {
  actorType: ActorType
  actorId?: string
  actorName: string
  action: string
  resourceType: string
  resourceId?: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  severity?: AuditSeverity
  ipAddress?: string
  userAgent?: string
}

export async function logAction(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      ...input,
      severity: input.severity ?? AuditSeverity.INFO,
    },
  })
}

export async function getRecentLogs(limit = 50, severity?: AuditSeverity) {
  return prisma.auditLog.findMany({
    where: severity ? { severity } : undefined,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}

export async function getLogsByResource(resourceType: string, resourceId: string) {
  return prisma.auditLog.findMany({
    where: {
      resourceType,
      resourceId,
    },
    orderBy: { timestamp: 'asc' },
  })
}
