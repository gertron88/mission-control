// Re-export all types from index
export * from './index'

// Additional type definitions
export interface Project {
  id: string
  name: string
  state: string
  charter?: string
  description?: string
  budgetAllocated?: number
  budgetSpent: number
}

export interface Agent {
  id: string
  handle: string
  name: string
  role: string
  status: string
  capabilities: string[]
  trustLevel: number
}

export interface MissionControlConfig {
  baseUrl: string
  apiKey: string
}
