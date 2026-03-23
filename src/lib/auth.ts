import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// API Key authentication middleware
export async function authenticateRequest(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!apiKey) {
    return null
  }
  
  // In production, validate against hashed keys in database
  // For now, using a simple validation
  const agent = await prisma.agent.findFirst({
    where: {
      apiKeyRef: apiKey
    }
  })
  
  return agent
}

// Human authentication (via NextAuth session)
export async function authenticateHuman(request: NextRequest) {
  // This would check the session cookie
  // For now, allowing all requests in development
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  // Validate JWT or session token
  // For now, check against a simple admin token
  if (token === process.env.ADMIN_API_TOKEN) {
    return { id: 'admin', name: 'Admin', role: 'ADMIN' }
  }
  
  return null
}

// Main authentication middleware
export function withAuth(handler: Function, options: { allowAgent?: boolean; allowHuman?: boolean } = {}) {
  return async (request: NextRequest, context: any) => {
    const { allowAgent = true, allowHuman = true } = options
    
    // Try agent authentication
    if (allowAgent) {
      const agent = await authenticateRequest(request)
      if (agent) {
        // Attach agent to request
        ;(request as any).agent = agent
        return handler(request, context)
      }
    }
    
    // Try human authentication
    if (allowHuman) {
      const human = await authenticateHuman(request)
      if (human) {
        ;(request as any).user = human
        return handler(request, context)
      }
    }
    
    // No valid authentication
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid API key or session required' },
      { status: 401 }
    )
  }
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (request: NextRequest) => {
    const identifier = request.headers.get('x-api-key') || 
                      request.ip || 
                      'anonymous'
    
    const now = Date.now()
    const record = rateLimitMap.get(identifier)
    
    if (!record || now > record.resetTime) {
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return null
    }
    
    if (record.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((record.resetTime - now) / 1000) },
        { status: 429 }
      )
    }
    
    record.count++
    return null
  }
}

// Combined middleware wrapper
export function createRouteHandler(
  handler: Function,
  options: { 
    allowAgent?: boolean
    allowHuman?: boolean
    rateLimitMax?: number
    rateLimitWindow?: number
  } = {}
) {
  return async (request: NextRequest, context: any) => {
    // Apply rate limiting
    if (options.rateLimitMax) {
      const rateLimitResponse = await rateLimit(
        options.rateLimitMax,
        options.rateLimitWindow || 60000
      )(request)
      
      if (rateLimitResponse) return rateLimitResponse
    }
    
    // Apply authentication
    const authHandler = withAuth(handler, {
      allowAgent: options.allowAgent ?? true,
      allowHuman: options.allowHuman ?? true
    })
    
    return authHandler(request, context)
  }
}
