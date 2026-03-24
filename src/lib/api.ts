/**
 * Type-safe API client layer
 * 
 * Features:
 * - Automatic JSON parsing
 * - Error normalization
 * - Request deduplication via React Query
 * - Type-safe request/response handling
 */

import { ApiResponse } from './api-utils'

/**
 * Base API configuration
 */
const API_BASE = '/api'

/**
 * API error types
 */
export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Request options type
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Build URL with query parameters
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  
  // Return just the pathname + search for relative URLs
  return url.pathname + url.search
}

/**
 * Normalize API errors into standard format
 */
function normalizeError(errorData: unknown): ApiClientError {
  if (typeof errorData === 'object' && errorData !== null) {
    const err = errorData as Record<string, unknown>
    return new ApiClientError(
      String(err.code || 'UNKNOWN_ERROR'),
      String(err.message || 'An unexpected error occurred'),
      typeof err.statusCode === 'number' ? err.statusCode : 500,
      err.details
    )
  }
  return new ApiClientError('UNKNOWN_ERROR', 'An unexpected error occurred', 500)
}

/**
 * Core API request function
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options
  
  const url = buildUrl(`${API_BASE}${path}`, params)
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'same-origin',
  }
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(url, config)
    
    // Parse JSON response
    let data: ApiResponse<T>
    try {
      data = await response.json()
    } catch {
      // Handle non-JSON responses
      if (!response.ok) {
        throw new ApiClientError(
          'HTTP_ERROR',
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }
      // For empty successful responses, return undefined
      return undefined as T
    }
    
    // Handle error responses
    if (!response.ok || !data.success) {
      if (data.error) {
        throw normalizeError(data.error)
      }
      throw new ApiClientError(
        'HTTP_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }
    
    return data.data as T
  } catch (error) {
    // Re-throw API errors
    if (error instanceof ApiClientError) {
      throw error
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Unable to connect to the server. Please check your connection.')
    }
    
    // Handle other errors
    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}

/**
 * API client methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> =>
    request<T>(path, { method: 'GET', params }),

  /**
   * POST request
   */
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body }),

  /**
   * PATCH request
   */
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body }),

  /**
   * PUT request
   */
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PUT', body }),

  /**
   * DELETE request
   */
  delete: <T>(path: string): Promise<T> =>
    request<T>(path, { method: 'DELETE' }),
}

/**
 * Typed API endpoints
 */
export const endpoints = {
  tasks: {
    list: (params?: { page?: number; limit?: number; status?: string; projectId?: string }) =>
      api.get<{ tasks: Task[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>('/tasks', params),
    get: (id: string) => api.get<Task>(`/tasks/${id}`),
    create: (data: CreateTaskInput) => api.post<Task>('/tasks', data),
    update: (id: string, data: UpdateTaskInput) => api.patch<Task>(`/tasks/${id}`, data),
    assign: (id: string) => api.post<Task>(`/tasks/${id}/assign`, {}),
    block: (id: string, data: { blockerType: string; blockerReason: string }) => api.post<Task>(`/tasks/${id}/block`, data),
    unblock: (id: string) => api.post<Task>(`/tasks/${id}/unblock`, {}),
  },
  projects: {
    list: (params?: { portfolioId?: string; state?: string }) => api.get<Project[]>('/projects', params),
    get: (id: string) => api.get<Project>(`/projects/${id}`),
    dependencies: (id: string) => api.get<ProjectDependencies>(`/projects/${id}/dependencies`),
  },
  agents: {
    list: (params?: { includeOffline?: boolean }) => api.get<Agent[]>('/agents', params),
    get: (id: string) => api.get<Agent>(`/agents/${id}`),
    heartbeat: (id: string) => api.post<Agent>(`/agents/${id}/heartbeat`, {}),
  },
  dispatch: {
    trigger: () => api.post<{ dispatched: number; assignments: string[]; errors: string[] }>('/dispatch', {}),
    status: () => api.get<{ readyTasks: number; availableAgents: number; timestamp: string }>('/dispatch'),
  },
  events: {
    stream: '/api/events',
  },
} as const

// ============================================================================
// Type Definitions
// ============================================================================

import { TaskStatus, TaskPriority, TaskType } from '@prisma/client'

export interface Task {
  id: string
  number: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  projectId: string
  project?: {
    id: string
    name: string
  }
  assigneeId?: string | null
  assignee?: {
    id: string
    handle: string
    name: string
    avatar?: string
  } | null
  milestoneId?: string | null
  milestone?: {
    id: string
    name: string
  } | null
  dependencies: string[]
  blockerType?: string | null
  blockerReason?: string | null
  dueDate?: string
  estimatedEffort?: number
  actualEffort?: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskInput {
  title: string
  description: string
  projectId: string
  milestoneId?: string
  priority?: TaskPriority
  type: TaskType
  tags?: string[]
  dueDate?: string
  estimatedEffort?: number
  dependencies?: string[]
  requiredTools?: string[]
  outputs?: Record<string, unknown>
  validationCriteria?: Record<string, unknown>
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  estimatedEffort?: number
  actualEffort?: number
  blockerType?: string | null
  blockerReason?: string | null
  actualOutputs?: Record<string, unknown>
}

export interface TaskFilters {
  status?: TaskStatus
  projectId?: string
  assigneeId?: string
  priority?: TaskPriority
  type?: TaskType
  overdue?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface Project {
  id: string
  name: string
  state: string
  charter?: string
  description?: string
  budgetAllocated?: number
  budgetSpent: number
  plannedStart?: string
  plannedEnd?: string
  actualStart?: string
  actualEnd?: string
  portfolioId: string
  portfolio?: {
    id: string
    name: string
  }
  _count?: {
    tasks: number
    milestones: number
  }
  tasks?: Array<{
    id: string
    number: number
    title: string
    status: string
    blockerType?: string
  }>
  createdAt: string
  updatedAt: string
}

export interface ProjectDependencies {
  tasks: Task[]
  dependencies: Array<{
    taskId: string
    dependsOnTaskId: string
    status: string
  }>
  blocked: string[]
  ready: string[]
}

export interface Agent {
  id: string
  handle: string
  name: string
  role: string
  status: string
  currentLoad: number
  maxLoad: number
  capabilities: string[]
  trustLevel: number
  model?: string
  lastSeenAt?: string
  _count?: {
    assignedTasks: number
  }
  heartbeats?: Array<{
    id: string
    timestamp: string
    status: string
    load: number
  }>
  performanceStats?: {
    success_rate: number
    tasks_completed: number
    average_task_time?: number
  }
  tradingConfig?: {
    maxPositionSize: number
    riskTolerance: string
    allowedStrategies: string[]
  }
  isActive: boolean
}

export interface DispatchResult {
  dispatched: number
  assignments: string[]
  errors: string[]
}

export interface DispatchStatus {
  readyTasks: number
  availableAgents: number
  timestamp: string
}

export interface DomainEvent {
  id: string
  type: string
  timestamp: string
  aggregateType: string
  aggregateId: string
  version: number
  actor?: {
    type: 'AGENT' | 'HUMAN' | 'SYSTEM'
    id: string
  }
  metadata?: {
    correlationId?: string
    causationId?: string
    [key: string]: unknown
  }
  payload: Record<string, unknown>
}
