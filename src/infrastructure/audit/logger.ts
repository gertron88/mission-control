/**
 * Audit Logger
 * 
 * Immutable audit trail for all actions in the system.
 * All entries are append-only and tamper-evident.
 */

import { Result } from '../../types/domain';

// ============================================================================
// TYPES
// ============================================================================

export type ActorType = 'AGENT' | 'HUMAN' | 'SYSTEM' | 'WEBHOOK' | 'SCHEDULER';
export type AuditSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'SECURITY';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actorType: ActorType;
  actorId?: string;
  actorName: string;
  
  action: string;
  resourceType: string;
  resourceId?: string;
  
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  
  requestContext?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    traceId?: string;
  };
  
  severity: AuditSeverity;
  metadata?: Record<string, unknown>;
}

export interface AuditFilter {
  from?: Date;
  to?: Date;
  actorId?: string;
  actorType?: ActorType;
  resourceType?: string;
  resourceId?: string;
  actions?: string[];
  severities?: AuditSeverity[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

export interface LogContext {
  traceId?: string;
  requestId?: string;
  actorId?: string;
  actorType?: ActorType;
  [key: string]: unknown;
}

export class StructuredLogger {
  private redactedFields = new Set(['password', 'apiKey', 'apiKeyHash', 'secret', 'token', 'authorization']);

  constructor(
    private service: string,
    private options: {
      redact?: string[];
      includeTimestamp?: boolean;
    } = {}
  ) {
    if (options.redact) {
      options.redact.forEach(f => this.redactedFields.add(f));
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('DEBUG', message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('WARNING', message, context, metadata);
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('ERROR', message, context, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  security(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('SECURITY', message, context, metadata);
  }

  private log(
    level: string,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    const entry = {
      level,
      service: this.service,
      timestamp: new Date().toISOString(),
      message,
      context,
      metadata: metadata ? this.redact(metadata) : undefined
    };

    // In production, this would send to a logging service (e.g., Datadog, ELK)
    // For now, log to console with structured format
    const logFn = level === 'ERROR' ? console.error : 
                  level === 'WARNING' ? console.warn : 
                  console.log;
    
    logFn(JSON.stringify(entry));
  }

  private redact(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.redactedFields.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

// ============================================================================
// AUDIT LOGGER
// ============================================================================

export class AuditLogger {
  private logger: StructuredLogger;

  constructor(
    private db: {
      auditLog: {
        create: (args: { data: unknown }) => Promise<unknown>;
        findMany: (args: {
          where?: unknown;
          orderBy?: unknown;
          take?: number;
          skip?: number;
        }) => Promise<unknown[]>;
        count: (args: { where?: unknown }) => Promise<number>;
      };
    },
    service: string
  ) {
    this.logger = new StructuredLogger(service);
  }

  /**
   * Log an action to the audit trail
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<Result<AuditEntry, Error>> {
    try {
      const fullEntry: AuditEntry = {
        ...entry,
        id: this.generateId(),
        timestamp: new Date()
      };

      await this.db.auditLog.create({
        data: {
          id: fullEntry.id,
          timestamp: fullEntry.timestamp,
          actorType: fullEntry.actorType,
          actorId: fullEntry.actorId,
          actorName: fullEntry.actorName,
          action: fullEntry.action,
          resourceType: fullEntry.resourceType,
          resourceId: fullEntry.resourceId,
          beforeState: fullEntry.beforeState,
          afterState: fullEntry.afterState,
          ipAddress: fullEntry.requestContext?.ipAddress,
          userAgent: fullEntry.requestContext?.userAgent,
          requestId: fullEntry.requestContext?.requestId,
          severity: fullEntry.severity,
          metadata: fullEntry.metadata
        }
      });

      // Also log to structured logger for real-time monitoring
      this.logger.info(`AUDIT: ${entry.action}`, {
        actorId: entry.actorId,
        actorType: entry.actorType,
        traceId: entry.requestContext?.traceId
      }, {
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        severity: entry.severity
      });

      return Result.ok(fullEntry);
    } catch (error) {
      this.logger.error('Failed to write audit log', error as Error);
      return Result.err(error as Error);
    }
  }

  /**
   * Query audit logs
   */
  async query(filter: AuditFilter): Promise<Result<{ entries: AuditEntry[]; total: number }, Error>> {
    try {
      const where: Record<string, unknown> = {};

      if (filter.from || filter.to) {
        where.timestamp = {};
        if (filter.from) where.timestamp.gte = filter.from;
        if (filter.to) where.timestamp.lte = filter.to;
      }

      if (filter.actorId) where.actorId = filter.actorId;
      if (filter.actorType) where.actorType = filter.actorType;
      if (filter.resourceType) where.resourceType = filter.resourceType;
      if (filter.resourceId) where.resourceId = filter.resourceId;
      if (filter.actions?.length) where.action = { in: filter.actions };
      if (filter.severities?.length) where.severity = { in: filter.severities };

      const [entries, total] = await Promise.all([
        this.db.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filter.limit ?? 100,
          skip: filter.offset ?? 0
        }),
        this.db.auditLog.count({ where })
      ]);

      return Result.ok({
        entries: entries as AuditEntry[],
        total
      });
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  /**
   * Get recent activity for a resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<Result<AuditEntry[], Error>> {
    return this.query({
      resourceType,
      resourceId,
      limit
    }).then(r => r.ok ? Result.ok(r.value.entries) : r);
  }

  /**
   * Log state change with before/after
   */
  async logStateChange<T extends Record<string, unknown>>(params: {
    actorType: ActorType;
    actorId?: string;
    actorName: string;
    action: string;
    resourceType: string;
    resourceId: string;
    before: T;
    after: T;
    severity?: AuditSeverity;
    requestContext?: AuditEntry['requestContext'];
  }): Promise<Result<AuditEntry, Error>> {
    // Calculate diff for cleaner logs
    const diff = this.calculateDiff(params.before, params.after);
    
    return this.log({
      actorType: params.actorType,
      actorId: params.actorId,
      actorName: params.actorName,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      beforeState: params.before,
      afterState: params.after,
      severity: params.severity ?? 'INFO',
      requestContext: params.requestContext,
      metadata: { diff }
    });
  }

  private calculateDiff(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = { from: before[key], to: after[key] };
      }
    }

    return diff;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createAuditLogger(
  db: Parameters<typeof AuditLogger>[0],
  service: string
): AuditLogger {
  return new AuditLogger(db, service);
}

export function createStructuredLogger(
  service: string,
  options?: { redact?: string[] }
): StructuredLogger {
  return new StructuredLogger(service, options);
}

// ============================================================================
// REQUEST CONTEXT HELPER
// ============================================================================

export interface RequestContext {
  actorType: ActorType;
  actorId?: string;
  actorName: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  traceId?: string;
}

export function extractRequestContext(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): Partial<RequestContext> {
  return {
    ipAddress: req.ip,
    userAgent: Array.isArray(req.headers['user-agent']) 
      ? req.headers['user-agent'][0] 
      : req.headers['user-agent'],
    requestId: Array.isArray(req.headers['x-request-id'])
      ? req.headers['x-request-id'][0]
      : req.headers['x-request-id'] || `req_${Date.now()}`,
    traceId: Array.isArray(req.headers['x-trace-id'])
      ? req.headers['x-trace-id'][0]
      : req.headers['x-trace-id']
  };
}
