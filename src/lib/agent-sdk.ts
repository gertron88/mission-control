/**
 * Mission Control Agent SDK
 * 
 * Client-side library for agents to report heartbeats, rate limits,
 * and task progress to Mission Control.
 * 
 * Usage:
 * ```typescript
 * import { MissionControlAgent } from '@/lib/agent-sdk'
 * 
 * const agent = new MissionControlAgent({
 *   agentId: 'agent-123',
 *   apiKey: process.env.MISSION_CONTROL_API_KEY,
 *   baseUrl: 'https://mission-control.vercel.app',
 * })
 * 
 * // Start heartbeat loop
 * agent.startHeartbeatLoop({ intervalMs: 30000 })
 * 
 * // Report task start
 * await agent.reportTaskStart('task-456')
 * 
 * // Report task completion
 * await agent.reportTaskComplete('task-456', { result: 'success' })
 * 
 * // Report rate limit hit
 * await agent.reportRateLimit({
 *   requestsRemaining: 0,
 *   resetAt: new Date(Date.now() + 3600000),
 * })
 * ```
 */

import { AgentStatus } from '@prisma/client'

interface AgentConfig {
  /** Agent unique identifier */
  agentId: string
  /** API key for authentication */
  apiKey: string
  /** Mission Control base URL */
  baseUrl: string
}

interface HeartbeatOptions {
  /** How often to send heartbeats in ms (default: 30000) */
  intervalMs?: number
  /** Include rate limit info (default: true) */
  includeRateLimits?: boolean
  /** Include resource metrics (default: true) */
  includeMetrics?: boolean
}

interface RateLimitInfo {
  /** Remaining requests */
  requestsRemaining?: number
  /** Total request limit */
  requestsLimit?: number
  /** When rate limit resets */
  resetAt: Date
  /** Whether limit was just hit */
  hitLimit?: boolean
}

interface TaskProgress {
  /** Task completion percentage (0-100) */
  percentComplete?: number
  /** Current step description */
  currentStep?: string
  /** Estimated remaining time in minutes */
  estimatedRemainingMinutes?: number
  /** Any intermediate results */
  intermediateResults?: Record<string, unknown>
}

/**
 * Mission Control Agent SDK
 */
export class MissionControlAgent {
  private config: AgentConfig
  private heartbeatInterval: NodeJS.Timeout | null = null
  private currentTaskId: string | null = null
  private currentTaskStartedAt: Date | null = null
  private lastHeartbeatAt: Date | null = null
  private consecutiveErrors = 0
  private maxConsecutiveErrors = 5

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * Get current task info for heartbeat
   */
  getCurrentTaskInfo(): { taskId: string | null; startedAt: Date | null } {
    return {
      taskId: this.currentTaskId,
      startedAt: this.currentTaskStartedAt,
    }
  }

  /**
   * Start automatic heartbeat loop
   */
  startHeartbeatLoop(options: HeartbeatOptions = {}): void {
    const { intervalMs = 30000, includeRateLimits = true, includeMetrics = true } = options

    if (this.heartbeatInterval) {
      console.warn('Heartbeat loop already running')
      return
    }

    // Send initial heartbeat
    this.sendHeartbeat({ includeRateLimits, includeMetrics })

    // Start loop
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat({ includeRateLimits, includeMetrics })
    }, intervalMs)

    console.log(`Heartbeat loop started (interval: ${intervalMs}ms)`)
  }

  /**
   * Stop heartbeat loop
   */
  stopHeartbeatLoop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('Heartbeat loop stopped')
    }
  }

  /**
   * Send a single heartbeat
   */
  async sendHeartbeat(options: { includeRateLimits?: boolean; includeMetrics?: boolean } = {}): Promise<void> {
    const { includeRateLimits = true, includeMetrics = true } = options

    try {
      const payload: Record<string, unknown> = {
        status: this.getAgentStatus(),
        activeTaskCount: this.currentTaskId ? 1 : 0,
        currentTaskId: this.currentTaskId,
        currentTaskStartedAt: this.currentTaskStartedAt?.toISOString(),
      }

      // Include resource metrics if requested
      if (includeMetrics) {
        const metrics = await this.getResourceMetrics()
        Object.assign(payload, metrics)
      }

      // Include rate limit info if requested
      if (includeRateLimits) {
        const rateLimits = await this.getRateLimitStatus()
        if (rateLimits) {
          payload.rateLimits = rateLimits
        }
      }

      const response = await fetch(`${this.config.baseUrl}/api/agents/${this.config.agentId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      this.lastHeartbeatAt = new Date()
      this.consecutiveErrors = 0

      // Check for warnings from server
      if (data.warnings && data.warnings.length > 0) {
        console.warn('Server warnings:', data.warnings)
      }

      // Check if we've been rate limited
      if (data.agent?.status === 'DISABLED') {
        console.warn('Agent has been disabled by server')
        this.handleDisabledState()
      }
    } catch (error) {
      this.consecutiveErrors++
      console.error(`Heartbeat failed (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error)

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('Too many consecutive heartbeat failures, stopping loop')
        this.stopHeartbeatLoop()
      }
    }
  }

  /**
   * Report that agent has started working on a task
   */
  async reportTaskStart(taskId: string): Promise<void> {
    this.currentTaskId = taskId
    this.currentTaskStartedAt = new Date()

    // Send immediate heartbeat
    await this.sendHeartbeat()

    console.log(`Task started: ${taskId}`)
  }

  /**
   * Report task progress
   */
  async reportTaskProgress(taskId: string, progress: TaskProgress): Promise<void> {
    if (this.currentTaskId !== taskId) {
      console.warn(`Task mismatch: current=${this.currentTaskId}, reported=${taskId}`)
      return
    }

    // This would typically call a specific progress API
    // For now, include in next heartbeat
    console.log(`Task ${taskId} progress:`, progress)
  }

  /**
   * Report task completion
   */
  async reportTaskComplete(taskId: string, result?: Record<string, unknown>): Promise<void> {
    if (this.currentTaskId !== taskId) {
      console.warn(`Task mismatch: current=${this.currentTaskId}, reported=${taskId}`)
    }

    try {
      await fetch(`${this.config.baseUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          status: 'COMPLETE',
          actualOutputs: result,
        }),
      })

      console.log(`Task completed: ${taskId}`)
    } catch (error) {
      console.error(`Failed to report task completion: ${error}`)
    }

    // Clear current task
    this.currentTaskId = null
    this.currentTaskStartedAt = null

    // Send immediate heartbeat
    await this.sendHeartbeat()
  }

  /**
   * Report task failure
   */
  async reportTaskFailure(taskId: string, error: Error | string): Promise<void> {
    if (this.currentTaskId !== taskId) {
      console.warn(`Task mismatch: current=${this.currentTaskId}, reported=${taskId}`)
    }

    try {
      await fetch(`${this.config.baseUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          status: 'FAILED',
          blockerType: 'FAILING_TESTS',
          blockerReason: error instanceof Error ? error.message : String(error),
        }),
      })

      console.log(`Task failed: ${taskId}`)
    } catch (err) {
      console.error(`Failed to report task failure: ${err}`)
    }

    // Clear current task
    this.currentTaskId = null
    this.currentTaskStartedAt = null

    // Send immediate heartbeat
    await this.sendHeartbeat()
  }

  /**
   * Report rate limit hit
   */
  async reportRateLimit(rateLimit: RateLimitInfo): Promise<void> {
    await this.sendHeartbeat({
      includeRateLimits: true,
    })

    console.log(`Rate limit reported, reset at: ${rateLimit.resetAt}`)
  }

  /**
   * Get agent status based on current state
   */
  private getAgentStatus(): AgentStatus {
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      return AgentStatus.ERROR
    }
    if (this.currentTaskId) {
      return AgentStatus.BUSY
    }
    return AgentStatus.ONLINE
  }

  /**
   * Get resource metrics
   * Override this method to provide custom metrics
   */
  protected async getResourceMetrics(): Promise<{
    cpuUsage?: number
    memoryUsage?: number
    memoryUsagePercent?: number
  }> {
    // Default implementation returns empty metrics
    // Subclasses should override this
    return {}
  }

  /**
   * Get rate limit status
   * Override this method to provide rate limit info
   */
  protected async getRateLimitStatus(): Promise<RateLimitInfo | null> {
    // Default implementation returns null
    // Subclasses should override this
    return null
  }

  /**
   * Handle when agent is disabled by server
   */
  private handleDisabledState(): void {
    console.warn('Agent disabled, entering cooldown mode')
    // Stop accepting new tasks
    this.stopHeartbeatLoop()

    // Could implement exponential backoff retry here
  }
}

/**
 * Node.js specific agent implementation with resource metrics
 */
export class NodeAgent extends MissionControlAgent {
  protected async getResourceMetrics(): Promise<{
    cpuUsage?: number
    memoryUsage?: number
    memoryUsagePercent?: number
  }> {
    // Get memory usage
    const usage = process.memoryUsage()
    const totalMemory = require('os').totalmem()

    return {
      memoryUsage: Math.round(usage.heapUsed / 1024 / 1024), // MB
      memoryUsagePercent: Math.round((usage.heapUsed / totalMemory) * 100),
    }
  }
}

/**
 * Create agent SDK instance from environment
 */
export function createAgentFromEnv(): MissionControlAgent {
  const agentId = process.env.AGENT_ID
  const apiKey = process.env.MISSION_CONTROL_API_KEY
  const baseUrl = process.env.MISSION_CONTROL_URL || 'http://localhost:3000'

  if (!agentId || !apiKey) {
    throw new Error('AGENT_ID and MISSION_CONTROL_API_KEY must be set')
  }

  return new NodeAgent({ agentId, apiKey, baseUrl })
}
