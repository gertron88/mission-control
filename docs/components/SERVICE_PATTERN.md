# Service Layer Pattern Guide

**Location:** \`src/services/*.service.ts\`  
**Purpose:** Business logic and orchestration  
**Dependencies:** Prisma, Result type, Event bus, Audit logger

---

## Service Structure Template

\`\`\`typescript
/**
 * [Name] Service
 * 
 * Handles all [name]-related business logic including:
 * - CRUD operations
 * - State transitions
 * - [Other responsibilities]
 */

import { PrismaClient, [Enums], Prisma } from '@prisma/client';
import { Result, [ErrorTypes] } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';
import { logAction } from '@/lib/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface [Name]ServiceDependencies {
  prisma: PrismaClient;
}

export interface Create[Name]Input {
  // Required fields for creation
}

export interface Update[Name]Input {
  // Optional fields for update
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class [Name]Service {
  constructor(private deps: [Name]ServiceDependencies) {}

  // -------------------------------------------------------------------------
  // READ OPERATIONS
  // -------------------------------------------------------------------------

  async get[Name](id: string): Promise<Result<[Name]WithRelations, Error>> {
    try {
      const item = await this.deps.prisma.[table].findFirst({
        where: { 
          id,
          isDeleted: false,  // ALWAYS filter soft deletes
        },
        include: {
          // Include related data as needed
        },
      });

      if (!item) {
        return Result.err(new Error('[Name] not found'));
      }

      return Result.ok(item);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async list[Name]s(options?: {
    page?: number;
    limit?: number;
    status?: [StatusEnum];
    // Other filters
  }): Promise<Result<{ items: [Name][]; total: number; hasMore: boolean }, Error>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const where: Prisma.[Name]WhereInput = {
        isDeleted: false,  // ALWAYS filter soft deletes
      };

      if (options?.status) {
        where.status = options.status;
      }

      const [items, total] = await Promise.all([
        this.deps.prisma.[table].findMany({
          where,
          include: {
            // Relations
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.deps.prisma.[table].count({ where }),
      ]);

      return Result.ok({
        items,
        total,
        hasMore: skip + items.length < total,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // -------------------------------------------------------------------------
  // WRITE OPERATIONS
  // -------------------------------------------------------------------------

  async create[Name](
    input: Create[Name]Input
  ): Promise<Result<[Name], Error>> {
    try {
      // Validate foreign keys exist
      if (input.[parentId]) {
        const parent = await this.deps.prisma.[parentTable].findUnique({
          where: { id: input.[parentId] },
        });
        if (!parent) {
          return Result.err(new Error('[Parent] not found'));
        }
      }

      // Create the record
      const item = await this.deps.prisma.[table].create({
        data: {
          ...input,
          // Set defaults
          status: 'INITIAL_STATUS',
          createdBy: input.creatorId,
          statusHistory: [{
            status: 'INITIAL_STATUS',
            timestamp: new Date().toISOString(),
            actor: input.creatorHandle,
            reason: '[Name] created',
          }],
        },
      });

      // Broadcast event
      broadcastEvent({
        type: '[NAME]_CREATED',
        [name]Id: item.id,
        data: item,
      });

      // Log action
      await logAction({
        actorType: ActorType.AGENT,
        actorId: input.creatorId,
        actorName: input.creatorHandle,
        action: '[NAME]_CREATED',
        resourceType: '[Name]',
        resourceId: item.id,
        afterState: item as Record<string, unknown>,
      });

      return Result.ok(item);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async update[Name](
    id: string,
    input: Update[Name]Input,
    actorId: string,
    actorHandle: string
  ): Promise<Result<[Name], Error>> {
    try {
      // Get current state
      const current = await this.deps.prisma.[table].findFirst({
        where: { id, isDeleted: false },
      });

      if (!current) {
        return Result.err(new Error('[Name] not found'));
      }

      // Check permissions
      const hasPermission = await this.checkPermission(
        current,
        actorId,
        'update'
      );
      if (!hasPermission) {
        return Result.err(new AuthorizationError('Not authorized'));
      }

      // Validate state transitions (if status changing)
      if (input.status && input.status !== current.status) {
        const canTransition = await this.validateTransition(
          current,
          input.status
        );
        if (!canTransition) {
          return Result.err(new StateTransitionError(
            '[NAME]',
            id,
            current.status,
            input.status,
            'Invalid state transition'
          ));
        }
      }

      // Build update data
      const updateData: Prisma.[Name]UpdateInput = {};
      const statusHistory = [...(current.statusHistory as any[] || [])];

      // Apply updates
      if (input.status && input.status !== current.status) {
        updateData.status = input.status;
        statusHistory.push({
          status: input.status,
          timestamp: new Date().toISOString(),
          actor: actorHandle,
          reason: 'Status updated',
        });
        updateData.statusHistory = statusHistory;
      }

      // Update the record
      const updated = await this.deps.prisma.[table].update({
        where: { id },
        data: updateData,
      });

      // Broadcast event
      broadcastEvent({
        type: '[NAME]_UPDATED',
        [name]Id: id,
        changes: input,
      });

      // Log action
      await logAction({
        actorType: ActorType.AGENT,
        actorId,
        actorName: actorHandle,
        action: '[NAME]_UPDATED',
        resourceType: '[Name]',
        resourceId: id,
        beforeState: current as Record<string, unknown>,
        afterState: updated as Record<string, unknown>,
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async delete[Name](
    id: string,
    actorId: string,
    actorHandle: string
  ): Promise<Result<void, Error>> {
    try {
      const item = await this.deps.prisma.[table].findFirst({
        where: { id, isDeleted: false },
      });

      if (!item) {
        return Result.err(new Error('[Name] not found'));
      }

      // Soft delete
      await this.deps.prisma.[table].update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Broadcast event
      broadcastEvent({
        type: '[NAME]_DELETED',
        [name]Id: id,
      });

      // Log action
      await logAction({
        actorType: ActorType.AGENT,
        actorId,
        actorName: actorHandle,
        action: '[NAME]_DELETED',
        resourceType: '[Name]',
        resourceId: id,
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS
  // -------------------------------------------------------------------------

  private async checkPermission(
    item: any,
    actorId: string,
    action: string
  ): Promise<boolean> {
    // Implement permission logic
    // Check if actor is creator, assignee, or coordinator
    return true;
  }

  private async validateTransition(
    current: any,
    newStatus: string
  ): Promise<boolean> {
    // Use state machine or validation logic
    return true;
  }
}
\`\`\`

---

## Rules

1. **ALWAYS return Result<T, Error>**
2. **ALWAYS filter isDeleted: false in queries**
3. **ALWAYS include actorId and actorHandle for mutations**
4. **ALWAYS broadcast events for state changes**
5. **ALWAYS log to audit log for mutations**
6. **ALWAYS validate foreign keys before creating**
7. **ALWAYS check permissions before mutations**
8. **ALWAYS use state machines for status transitions**
9. **ALWAYS use soft delete (never hard delete)**
10. **ALWAYS handle errors and wrap in Result.err**

---

## Service Factory

**File:** \`src/services/factory.ts\`

\`\`\`typescript
import { PrismaClient } from '@prisma/client';
import { TaskService } from './task.service';
import { AgentService } from './agent.service';
import { ProjectService } from './project.service';

const prisma = new PrismaClient();

export interface Services {
  taskService: TaskService;
  agentService: AgentService;
  projectService: ProjectService;
}

export function getServices(): Services {
  return {
    taskService: new TaskService({ prisma }),
    agentService: new AgentService({ prisma }),
    projectService: new ProjectService({ prisma }),
  };
}
\`\`\`

---

## Usage in API Routes

\`\`\`typescript
import { getServices } from '@/services';

export async function GET() {
  const { taskService } = getServices();
  const result = await taskService.listTasks({ page: 1, limit: 20 });
  
  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 500 });
  }
  
  return Response.json(result.value);
}
\`\`\`

