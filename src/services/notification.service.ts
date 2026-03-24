/**
 * Notification Service
 * 
 * Handles notifications to agents and humans across multiple channels.
 * Supports Discord, in-app, and webhook notifications.
 */

import { PrismaClient, ActorType } from '@prisma/client';
import { Result } from '@/types/domain';
import { broadcastEvent } from '@/lib/events';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationServiceDependencies {
  prisma: PrismaClient;
  discord?: {
    sendMessage: (channel: string, message: string) => Promise<void>;
  };
}

export interface NotificationInput {
  recipientType: 'AGENT' | 'HUMAN' | 'CHANNEL';
  recipientId: string;
  type: 'TASK_ASSIGNED' | 'BLOCKER' | 'KILL_SWITCH' | 'ESCALATION' | 
        'APPROVAL_REQUIRED' | 'TASK_COMPLETED' | 'PROJECT_STATUS' | 'SYSTEM';
  title: string;
  message: string;
  channel: 'discord' | 'email' | 'in_app' | 'webhook';
  taskId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  delivered: boolean;
  channel: string;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class NotificationService {
  constructor(private deps: NotificationServiceDependencies) {}

  /**
   * Send a notification
   */
  async send(input: NotificationInput): Promise<Result<NotificationDeliveryResult, Error>> {
    try {
      // Create notification record
      const notification = await this.deps.prisma.notification.create({
        data: {
          recipientType: input.recipientType,
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          message: input.message,
          channel: input.channel,
          taskId: input.taskId,
          projectId: input.projectId,
        }
      });

      // Deliver based on channel
      let delivered = false;
      let error: string | undefined;

      try {
        switch (input.channel) {
          case 'discord':
            await this.sendDiscordNotification(input);
            delivered = true;
            break;
            
          case 'in_app':
            // In-app notifications are just the database record
            delivered = true;
            break;
            
          case 'webhook':
            await this.sendWebhookNotification(input);
            delivered = true;
            break;
            
          default:
            error = `Unknown channel: ${input.channel}`;
        }
      } catch (deliveryError) {
        error = deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
      }

      // Update delivery status
      if (delivered) {
        await this.deps.prisma.notification.update({
          where: { id: notification.id },
          data: { deliveredAt: new Date() }
        });
      }

      // Broadcast event for real-time updates
      broadcastEvent({
        type: 'NOTIFICATION_SENT',
        data: {
          notificationId: notification.id,
          recipientId: input.recipientId,
          type: input.type,
          delivered
        }
      });

      return Result.ok({
        notificationId: notification.id,
        delivered,
        channel: input.channel,
        error
      });
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Send notification to multiple recipients
   */
  async broadcast(
    recipients: Array<{ type: string; id: string }>,
    input: Omit<NotificationInput, 'recipientType' | 'recipientId'>
  ): Promise<Result<NotificationDeliveryResult[], Error>> {
    const results: NotificationDeliveryResult[] = [];
    
    for (const recipient of recipients) {
      const result = await this.send({
        ...input,
        recipientType: recipient.type as 'AGENT' | 'HUMAN' | 'CHANNEL',
        recipientId: recipient.id
      });
      
      if (result.ok) {
        results.push(result.value);
      }
    }
    
    return Result.ok(results);
  }

  /**
   * Get notifications for a recipient
   */
  async getNotifications(
    recipientId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Result<any[], Error>> {
    try {
      const notifications = await this.deps.prisma.notification.findMany({
        where: {
          recipientId,
          ...(options?.unreadOnly && { readAt: null })
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50
      });
      
      return Result.ok(notifications);
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Result<void, Error>> {
    try {
      await this.deps.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() }
      });
      
      return Result.ok(undefined);
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Send task assignment notification
   */
  async notifyTaskAssigned(
    agentId: string,
    taskId: string,
    taskTitle: string,
    projectName: string
  ): Promise<Result<NotificationDeliveryResult, Error>> {
    return this.send({
      recipientType: 'AGENT',
      recipientId: agentId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You've been assigned "${taskTitle}" in ${projectName}`,
      channel: 'in_app',
      taskId,
    });
  }

  /**
   * Send blocker notification
   */
  async notifyBlocker(
    projectId: string,
    taskId: string,
    blockerType: string,
    reason: string
  ): Promise<Result<NotificationDeliveryResult[], Error>> {
    // Notify project stakeholders
    const project = await this.deps.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { status: { not: 'COMPLETE' } },
          include: { assignee: true }
        }
      }
    });

    if (!project) {
      return Result.err(new Error('Project not found'));
    }

    // Get unique assignees
    const assigneeIds = [...new Set(
      project.tasks
        .filter(t => t.assigneeId)
        .map(t => t.assigneeId!)
    )];

    return this.broadcast(
      assigneeIds.map(id => ({ type: 'AGENT', id })),
      {
        type: 'BLOCKER',
        title: 'Task Blocked',
        message: `Task blocked: ${blockerType}. ${reason}`,
        channel: 'in_app',
        taskId,
        projectId
      }
    );
  }

  /**
   * Send escalation notification to coordinators
   */
  async notifyEscalation(
    severity: 'WARNING' | 'URGENT' | 'CRITICAL',
    resourceType: string,
    resourceId: string,
    message: string,
    projectId: string
  ): Promise<Result<NotificationDeliveryResult[], Error>> {
    // Get all coordinators
    const coordinators = await this.deps.prisma.agent.findMany({
      where: { role: 'COORDINATOR', isActive: true }
    });

    return this.broadcast(
      coordinators.map(c => ({ type: 'AGENT', id: c.id })),
      {
        type: 'ESCALATION',
        title: `Escalation: ${severity}`,
        message,
        channel: severity === 'CRITICAL' ? 'discord' : 'in_app',
        projectId
      }
    );
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async sendDiscordNotification(input: NotificationInput): Promise<void> {
    if (!this.deps.discord) {
      throw new Error('Discord client not configured');
    }

    const emoji = this.getNotificationEmoji(input.type);
    const message = `${emoji} **${input.title}**\n${input.message}`;
    
    await this.deps.discord.sendMessage('notifications', message);
  }

  private async sendWebhookNotification(input: NotificationInput): Promise<void> {
    // Get active webhooks for this event type
    const webhooks = await this.deps.prisma.webhook.findMany({
      where: {
        isActive: true,
        eventTypes: { has: input.type }
      }
    });

    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhook.secret
          },
          body: JSON.stringify({
            type: input.type,
            title: input.title,
            message: input.message,
            taskId: input.taskId,
            projectId: input.projectId,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        // Update webhook stats
        await this.deps.prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastUsedAt: new Date(),
            successCount: { increment: 1 }
          }
        });
      } catch (error) {
        // Update webhook error stats
        await this.deps.prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastError: error instanceof Error ? error.message : String(error),
            failCount: { increment: 1 }
          }
        });
        throw error;
      }
    }
  }

  private getNotificationEmoji(type: NotificationInput['type']): string {
    const emojis: Record<string, string> = {
      'TASK_ASSIGNED': '📋',
      'BLOCKER': '🚫',
      'KILL_SWITCH': '🚨',
      'ESCALATION': '⚠️',
      'APPROVAL_REQUIRED': '👀',
      'TASK_COMPLETED': '✅',
      'PROJECT_STATUS': '📊',
      'SYSTEM': '🔔'
    };
    return emojis[type] || '🔔';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createNotificationService(
  deps: NotificationServiceDependencies
): NotificationService {
  return new NotificationService(deps);
}
