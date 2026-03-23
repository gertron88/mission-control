// Enhanced API utilities with validation, error handling, and logging

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from './prisma'
import { logAction } from './audit'

// Standard API response format
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Error handler that converts errors to standard response
export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Error && error.message?.includes('Unique constraint')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'Resource already exists',
        },
      },
      { status: 409 }
    )
  }

  if (error instanceof Error && error.message?.includes('Foreign key constraint')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFERENCE_ERROR',
          message: 'Referenced resource does not exist',
        },
      },
      { status: 400 }
    )
  }

  // Default error
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    },
    { status: 500 }
  )
}

// Success response helper
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse<T>['meta']
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status: statusCode }
  )
}

// Pagination helper
export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

// Async handler wrapper
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Validation wrapper
export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (data: z.infer<T>, req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      let body: unknown

      // Try to parse JSON body
      try {
        body = await request.json()
      } catch {
        body = {}
      }

      const validated = schema.parse(body)
      return await handler(validated, request, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Rate limiting with Redis (simplified version using Map)
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { allowed: true }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true }
}

// Authentication helper
export async function authenticateAgent(apiKey: string) {
  const agent = await prisma.agent.findUnique({
    where: { apiKeyRef: apiKey },
  })

  if (!agent || !agent.isActive) {
    throw new ApiError('UNAUTHORIZED', 'Invalid or inactive API key', 401)
  }

  return agent
}

// Request context type
export interface RequestContext {
  agent?: {
    id: string
    handle: string
    name: string
    role: string
  }
  user?: {
    id: string
    name: string
    role: string
  }
}

// Middleware composer
export function composeMiddleware(...middlewares: Function[]) {
  return async (request: NextRequest, context?: any) => {
    for (const middleware of middlewares) {
      const result = await middleware(request, context)
      if (result instanceof NextResponse) {
        return result
      }
    }
  }
}
