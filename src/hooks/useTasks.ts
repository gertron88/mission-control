'use client'

import { useEffect, useState } from 'react'

interface Task {
  id: string
  number: number
  title: string
  description: string
  status: string
  priority: string
  type: string
  assignee?: {
    id: string
    handle: string
    name: string
    avatar?: string
  } | null
  milestone?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    name: string
  }
  dependencies: string[]
  blockerType?: string | null
  blockerReason?: string | null
  dueDate?: string
  estimatedEffort?: number
  createdAt: string
}

interface UseTasksOptions {
  projectId?: string
  status?: string
  assigneeId?: string
}

export function useTasks(options: UseTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams()
      if (options.projectId) params.set('projectId', options.projectId)
      if (options.status) params.set('status', options.status)
      if (options.assigneeId) params.set('assigneeId', options.assigneeId)
      
      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [options.projectId, options.status, options.assigneeId])

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update task')
    await fetchTasks()
    return response.json()
  }

  return { tasks, loading, error, refetch: fetchTasks, updateTask }
}
