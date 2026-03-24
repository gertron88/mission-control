import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { EventEmitter } from 'events'

// Types
export * from './types'

export interface AgentConfig {
  baseUrl: string
  apiKey: string
  agentId: string
  handle: string
  heartbeatInterval?: number
  pollInterval?: number
  capabilities?: string[]
  maxRetries?: number
  retryDelay?: number
}

export interface Task {
  id: string
  number: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  projectId: string
  project?: Project
  milestoneId?: string
  assigneeId?: string
  assignee?: Agent
  dependencies: string[]
  requiredTools: string[]
  estimatedEffort?: number
  actualEffort?: number
  dueDate?: string
  outputs?: Record<string, unknown>
  validationCriteria?: Record<string, unknown>
  blockerType?: string
  blockerReason?: string
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 
  | 'QUEUED' 
  | 'READY' 
  | 'ASSIGNED' 
  | 'RUNNING' 
  | 'AWAITING_DEPENDENCY' 
  | 'AWAITING_VALIDATION' 
  | 'BLOCKED' 
  | 'FAILED' 
  | 'COMPLETE' 
  | 'CANCELED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TaskType = 
  | 'FEATURE' 
  | 'BUG' 
  | 'TRADING_STRATEGY' 
  | 'INFRASTRUCTURE' 
  | 'SECURITY' 
  | 'RESEARCH' 
  | 'DOCUMENTATION' 
  | 'DEPLOYMENT'
  | 'ANALYSIS'
  | 'COORDINATION'
  | 'TESTING'
  | 'CODE_REVIEW'

export interface Project {
  id: string
  name: string
  slug: string
  state: string
  description?: string
}

export interface Agent {
  id: string
  handle: string
  name: string
  role: string
  status: string
  capabilities: string[]
  trustLevel: number
  currentLoad: number
  maxLoad: number
}

export interface TaskFilter {
  status?: TaskStatus
  projectId?: string
  assigneeId?: string
  priority?: TaskPriority
  type?: TaskType
  milestoneId?: string
  overdue?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface TaskUpdate {
  status?: TaskStatus
  title?: string
  description?: string
  actualEffort?: number
  actualOutputs?: Record<string, unknown>
  blockerType?: string | null
  blockerReason?: string | null
  blockerResolution?: string
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export interface TaskCreate {
  title: string
  description: string
  type: TaskType
  projectId: string
  priority?: TaskPriority
  milestoneId?: string
  assigneeId?: string
  requiredTools?: string[]
  estimatedEffort?: number
  dueDate?: string
  dependencies?: string[]
  tags?: string[]
  outputs?: Record<string, unknown>
  validationCriteria?: Record<string, unknown>
}

export interface HeartbeatData {
  status?: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR'
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  networkLatency?: number
  activeTaskCount?: number
  metadata?: Record<string, unknown>
}

export interface ApiError extends Error {
  code: string
  statusCode: number
  details?: unknown
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: PaginationMeta
}

// Custom error class
export class MissionControlError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'MissionControlError'
  }
}

// Retry helper
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delay: number
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof MissionControlError && error.statusCode < 500) {
        throw error
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError
}

// Main SDK class
export class MissionControlAgent extends EventEmitter {
  private client: AxiosInstance
  private config: Required<AgentConfig>
  private heartbeatTimer?: NodeJS.Timeout
  private pollTimer?: NodeJS.Timeout
  private connected = false
  private currentTasks: Task[] = []
  private eventSource?: EventSource
  private lastError?: Error
  private consecutiveErrors = 0

  constructor(config: AgentConfig) {
    super()
    
    this.config = {
      heartbeatInterval: 30000,
      pollInterval: 60000,
      capabilities: [],
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        'X-Agent-ID': this.config.agentId,
        'X-Agent-Handle': this.config.handle,
      },
      timeout: 30000,
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const missionControlError = this.parseError(error)
        this.emit('error', missionControlError)
        return Promise.reject(missionControlError)
      }
    )
  }

  private parseError(error: AxiosError): MissionControlError {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error
      return new MissionControlError(
        apiError.code || 'UNKNOWN_ERROR',
        apiError.message || 'An error occurred',
        error.response.status,
        apiError.details
      )
    }

    if (error.code === 'ECONNABORTED') {
      return new MissionControlError(
        'TIMEOUT',
        'Request timed out',
        408
      )
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new MissionControlError(
        'CONNECTION_ERROR',
        'Cannot connect to Mission Control',
        503
      )
    }

    return new MissionControlError(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred',
      500
    )
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.connected) {
      throw new MissionControlError(
        'ALREADY_CONNECTED',
        'Agent is already connected',
        400
      )
    }

    // Test connection
    try {
      await this.getAgentInfo()
    } catch (error) {
      throw new MissionControlError(
        'CONNECTION_FAILED',
        'Failed to connect to Mission Control. Check your API key and URL.',
        401
      )
    }

    // Update agent status to online
    await this.updateAgentStatus('ONLINE')

    // Start heartbeat
    this.startHeartbeat()

    // Start polling for tasks
    this.startPolling()

    // Connect to real-time events
    this.connectEventSource()

    this.connected = true
    this.consecutiveErrors = 0
    this.emit('connected')
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.stopPolling()
    this.disconnectEventSource()

    try {
      await this.updateAgentStatus('OFFLINE')
    } catch {
      // Ignore errors on disconnect
    }

    this.connected = false
    this.emit('disconnected')
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendHeartbeat('ONLINE')
        this.consecutiveErrors = 0
      } catch (error) {
        this.consecutiveErrors++
        this.emit('error', error)
        
        // If too many consecutive errors, disconnect
        if (this.consecutiveErrors > 5) {
          this.emit('connection_lost')
        }
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private startPolling(): void {
    // Initial poll
    this.pollTasks()

    this.pollTimer = setInterval(async () => {
      try {
        await this.pollTasks()
      } catch (error) {
        this.emit('error', error)
      }
    }, this.config.pollInterval)
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = undefined
    }
  }

  private connectEventSource(): void {
    if (typeof EventSource === 'undefined') {
      return // Skip in Node.js environments without polyfill
    }

    try {
      this.eventSource = new EventSource(
        `${this.config.baseUrl}/api/events?agentId=${this.config.agentId}`
      )

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleServerEvent(data)
        } catch {
          // Ignore parse errors
        }
      }

      this.eventSource.onerror = () => {
        this.emit('error', new MissionControlError('EVENT_SOURCE_ERROR', 'Event source error', 500))
      }
    } catch {
      // EventSource not available
    }
  }

  private disconnectEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = undefined
    }
  }

  private handleServerEvent(data: any): void {
    switch (data.type) {
      case 'TASK_ASSIGNED':
        if (data.assigneeId === this.config.agentId) {
          this.emit('task_assigned', data.task)
        }
        break
      case 'KILL_SWITCH_TRIGGERED':
        this.emit('kill_switch', data)
        break
      case 'TASK_UPDATED':
        // Update local cache
        const index = this.currentTasks.findIndex(t => t.id === data.taskId)
        if (index !== -1) {
          this.currentTasks[index] = { ...this.currentTasks[index], ...data.changes }
        }
        break
    }
  }

  // Heartbeat
  async sendHeartbeat(data: HeartbeatData = {}): Promise<void> {
    await withRetry(
      () => this.client.post(`/api/agents/${this.config.agentId}/heartbeat`, {
        status: data.status || 'ONLINE',
        ...data
      }),
      this.config.maxRetries,
      this.config.retryDelay
    )
  }

  private async updateAgentStatus(status: string): Promise<void> {
    await withRetry(
      () => this.client.patch(`/api/agents/${this.config.agentId}`, { status }),
      this.config.maxRetries,
      this.config.retryDelay
    )
  }

  // Task management
  private async pollTasks(): Promise<void> {
    const tasks = await this.getTasks({ 
      assigneeId: this.config.agentId,
      status: 'READY',
      limit: 50
    })
    
    // Find new tasks
    const newTasks = tasks.filter(
      task => !this.currentTasks.some(t => t.id === task.id)
    )

    // Update current tasks
    this.currentTasks = tasks

    // Emit events for new tasks
    for (const task of newTasks) {
      this.emit('task', task)
    }
  }

  async getTasks(filter: TaskFilter = {}): Promise<Task[]> {
    const response = await withRetry(
      () => this.client.get('/api/tasks', { params: filter }),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data || []
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await withRetry(
      () => this.client.get(`/api/tasks/${taskId}`),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data
  }

  async updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
    const response = await withRetry(
      () => this.client.patch(`/api/tasks/${taskId}`, updates),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data
  }

  async createTask(taskData: TaskCreate): Promise<Task> {
    const response = await withRetry(
      () => this.client.post('/api/tasks', taskData),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data
  }

  async deleteTask(taskId: string): Promise<void> {
    await withRetry(
      () => this.client.delete(`/api/tasks/${taskId}`),
      this.config.maxRetries,
      this.config.retryDelay
    )
  }

  async reportBlocker(
    taskId: string, 
    type: string, 
    reason: string,
    resolution?: string
  ): Promise<Task> {
    return this.updateTask(taskId, {
      status: 'BLOCKED',
      blockerType: type,
      blockerReason: reason,
      blockerResolution: resolution
    })
  }

  async resolveBlocker(
    taskId: string,
    resolution: string,
    newStatus: TaskStatus = 'RUNNING'
  ): Promise<Task> {
    return this.updateTask(taskId, {
      status: newStatus,
      blockerType: null,
      blockerReason: null,
      blockerResolution: resolution
    })
  }

  // Activity logging
  async logActivity(
    type: string, 
    description: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    console.log(`[${this.config.handle}] ${type}: ${description}`, metadata)
    // In future: POST to /api/activities
  }

  // Agent info
  async getAgentInfo(): Promise<Agent> {
    const response = await withRetry(
      () => this.client.get(`/api/agents/${this.config.agentId}`),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data
  }

  async getAllAgents(): Promise<Agent[]> {
    const response = await withRetry(
      () => this.client.get('/api/agents'),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data || []
  }

  // Project info
  async getProjects(): Promise<Project[]> {
    const response = await withRetry(
      () => this.client.get('/api/projects'),
      this.config.maxRetries,
      this.config.retryDelay
    )
    return response.data.data || []
  }

  // Kill switch check
  async checkKillSwitch(): Promise<{ active: boolean; scope?: string; reason?: string }> {
    try {
      const agent = await this.getAgentInfo()
      return {
        active: agent.tradingConfig?.killSwitchEnabled || false,
        scope: 'AGENT',
        reason: agent.tradingConfig?.killSwitchReason
      }
    } catch {
      return { active: false }
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected
  }

  getCurrentTasks(): Task[] {
    return [...this.currentTasks]
  }

  getConfig(): AgentConfig {
    return { ...this.config }
  }

  // Event handlers (typed)
  onTask(handler: (task: Task) => void): void {
    this.on('task', handler)
  }

  onTaskAssigned(handler: (task: Task) => void): void {
    this.on('task_assigned', handler)
  }

  onKillSwitch(handler: (data: any) => void): void {
    this.on('kill_switch', handler)
  }

  onError(handler: (error: MissionControlError) => void): void {
    this.on('error', handler)
  }

  onConnected(handler: () => void): void {
    this.on('connected', handler)
  }

  onDisconnected(handler: () => void): void {
    this.on('disconnected', handler)
  }

  onConnectionLost(handler: () => void): void {
    this.on('connection_lost', handler)
  }
}

// Export factory function
export function createAgent(config: AgentConfig): MissionControlAgent {
  return new MissionControlAgent(config)
}

// Default export
export default MissionControlAgent
