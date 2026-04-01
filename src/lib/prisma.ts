import { PrismaClient } from '@prisma/client'
import { createServices } from '@/services'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Initialize services with the Prisma client
// This ensures services are ready when API routes call getServices()
if (typeof globalForPrisma.prisma === 'undefined' || !globalForPrisma.prisma) {
  createServices(prisma)
}
