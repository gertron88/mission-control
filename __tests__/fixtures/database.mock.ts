/**
 * Database Mock Utilities
 * 
 * Mock implementations for Prisma and database operations.
 */

// Mock Prisma Client
export const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  agent: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  event: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  tradingConfig: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  milestone: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

// Reset all mocks
export function resetDatabaseMocks(): void {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    }
  });
}

// Helper to setup mock return values
export function mockPrismaReturn(
  model: keyof typeof mockPrisma,
  method: string,
  value: unknown
): void {
  const modelObj = mockPrisma[model] as Record<string, jest.Mock>;
  if (modelObj && method in modelObj) {
    modelObj[method].mockResolvedValue(value);
  }
}

// Helper to setup mock rejection
export function mockPrismaReject(
  model: keyof typeof mockPrisma,
  method: string,
  error: Error
): void {
  const modelObj = mockPrisma[model] as Record<string, jest.Mock>;
  if (modelObj && method in modelObj) {
    modelObj[method].mockRejectedValue(error);
  }
}
