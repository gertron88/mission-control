# API Routes Specification

**Location:** \`src/app/api/**/*.ts\`  
**Purpose:** HTTP endpoints for Mission Control API  
**Dependencies:** Services, Result type, Zod validation

---

## Route Structure

### File Pattern

\`\`\`
src/app/api/
├── [resource]/
│   ├── route.ts           # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts       # GET (detail), PATCH (update), DELETE
│       └── [action]/
│           └── route.ts   # POST (custom actions)
\`\`\`

### Standard Route Template

\`\`\`typescript
// src/app/api/[resource]/route.ts
import { NextRequest } from 'next/server';
import { getServices } from '@/services';
import { ZodError, z } from 'zod';
import { StateTransitionError, ValidationError, AuthorizationError } from '@/types/domain';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSchema = z.object({
  // Define POST body schema
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  projectId: z.string().cuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  type: z.enum(['FEATURE', 'BUG', 'TRADING_STRATEGY', 'INFRASTRUCTURE', 
                'SECURITY', 'RESEARCH', 'DOCUMENTATION', 'DEPLOYMENT', 
                'ANALYSIS', 'COORDINATION', 'TESTING', 'CODE_REVIEW']),
});

const updateSchema = z.object({
  // Define PATCH body schema - all optional
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['QUEUED', 'READY', 'ASSIGNED', 'RUNNING', 
                  'AWAITING_VALIDATION', 'BLOCKED', 'FAILED', 
                  'COMPLETE', 'CANCELED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
}).strict(); // .strict() prevents unknown fields

// ============================================================================
// GET /api/[resource] - List
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const status = searchParams.get('status') as TaskStatus | undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const { [resource]Service } = getServices();
    
    const result = await [resource]Service.list[Resources]({
      page,
      limit,
      status,
      projectId,
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return Response.json(result.value);
  } catch (error) {
    console.error('[API] GET /api/[resource] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/[resource] - Create
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validated = createSchema.parse(body);
    
    // Get actor from auth context
    const actorId = request.headers.get('x-agent-id') || 'system';
    const actorHandle = request.headers.get('x-agent-handle') || 'system';
    
    const { [resource]Service } = getServices();
    
    const result = await [resource]Service.create[Resource]({
      ...validated,
      creatorId: actorId,
      creatorHandle: actorHandle,
    });

    if (!result.ok) {
      // Determine appropriate status code
      const status = getErrorStatusCode(result.error);
      return Response.json(
        { error: result.error.message },
        { status }
      );
    }

    return Response.json(result.value, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('[API] POST /api/[resource] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
