import axios, { AxiosInstance, AxiosError } from 'axios'
import { EventEmitter } from 'events'

// Types
export interface AgentConfig {
  baseUrl: string
  apiKey: string
  agentId: string
  handle: string
  heartbeatInterval?: number
  pollInterval?: number
  capabilities?: string[]
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
  milestoneId?: string
  assigneeId?: string
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

export interface TaskFilter {
  status?: TaskStatus
  projectId?: string
  assigneeId?: string
}

export interface TaskUpdate {
  status?: TaskStatus
  title?: string
  description?: string
  actualEffort?: number
  actualOutputs?: Record<string, unknown>
  actorId?: string
  actorName?: string
}

export interface TaskCreate {
  title: string
  description: string
  type: TaskType
  priority?: TaskPriority
  projectId: string
  milestoneId?: string
  requiredTools?: string[]
  estimatedEffort?: number
  dueDate?: string
  dependencies?: string[]
  outputs?: Record<string, unknown>
  validationCriteria?: Record<string, unknown>
}

export interface HeartbeatData {
  status?: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR'
  cpuUsage?: number
  memoryUsage?: number
  activeTaskCount?: number
  metadata?: Record<string, unknown>
}

export interface BlockerReport {
  taskId: string
  type: string
  reason: string
}

export class MissionControlAgent extends EventEmitter {
  private client: AxiosInstance
  private config: Required<AgentConfig>
  private heartbeatTimer?: NodeJS.Timeout
  private pollTimer?: NodeJS.Timeout
  private connected = false
  private currentTasks: Task[] = []

  constructor(config: AgentConfig) {
    super()
    
    this.config = {
      heartbeatInterval: 30000,
      pollInterval: 60000,
      capabilities: [],
      ...config
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.emit('error', error)
        return Promise.reject(error)
      }
    )
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Agent already connected')
    }

    // Update agent status to online
    await this.updateAgentStatus('ONLINE')

    // Start heartbeat
    this.startHeartbeat()

    // Start polling for tasks
    this.startPolling()

    this.connected = true
    this.emit('connected')
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.stopPolling()

    // Update agent status to offline
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
      } catch (error) {
        this.emit('error', error)
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

  // Heartbeat
  async sendHeartbeat(status?: string, metadata?: Record<string, unknown>): Promise<void> {
    const data: HeartbeatData = {
      status: status as any,
      ...metadata
    }

    await this.client.post(`/api/agents/${this.config.agentId}/heartbeat`, data)
  }

  private async updateAgentStatus(status: string): Promise<void> {
    await this.client.patch(`/api/agents/${this.config.agentId}`, { status })
  }

  // Task management
  private async pollTasks(): Promise<void> {
    const tasks = await this.getTasks({ status: 'READY' })
    
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
    const params = new URLSearchParams()
    if (filter.status) params.set('status', filter.status)
    if (filter.projectId) params.set('projectId', filter.projectId)
    if (filter.assigneeId) params.set('assigneeId', filter.assigneeId)

    const response = await this.client.get(`/api/tasks?${params}`)
    return response.data
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await this.client.get(`/api/tasks/${taskId}`)
    return response.data
  }

  async updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
    const data = {
      ...updates,
      actorId: this.config.agentId,
      actorName: this.config.handle
    }

    const response = await this.client.patch(`/api/tasks/${taskId}`, data)
    return response.data
  }

  async createTask(taskData: TaskCreate): Promise<Task> {
    const data = {
      ...taskData,
      creatorId: this.config.agentId
    }

    const response = await this.client.post('/api/tasks', data)
    return response.data
  }

  async reportBlocker(taskId: string, type: string, reason: string): Promise<Task> {
    return this.updateTask(taskId, {
      status: 'BLOCKED'
    })
  }

  // Activity logging
  async logActivity(
    type: string, 
    description: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // This would post to an activity endpoint
    // For now, logging to console
    console.log(`[${this.config.handle}] ${type}: ${description}`, metadata)
  }

  // Event handlers (typed)
  onTask(handler: (task: Task) => void): void {
    this.on('task', handler)
  }

  onKillSwitch(handler: () => void): void {
    this.on('kill-switch', handler)
  }

  onError(handler: (error: Error) => void): void {
    this.on('error', handler)
  }

  // Check if kill switch is active
  async checkKillSwitch(): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/agents/${this.config.agentId}`)
      return response.data.tradingConfig?.killSwitchEnabled || false
    } catch {
      return false
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected
  }

  getCurrentTasks(): Task[] {
    return [...this.currentTasks]
  }
}

// Export factory function
export function createAgent(config: AgentConfig): MissionControlAgent {
  return new MissionControlAgent(config)
}

// Re-export types
export * from './types'
