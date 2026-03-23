'use client'

import { useEffect, useState } from 'react'

interface Project {
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
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return { projects, loading, error, refetch: fetchProjects }
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch project')
      const data = await response.json()
      setProject(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const updateProject = async (updates: Partial<Project>) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update project')
    await fetchProject()
    return response.json()
  }

  return { project, loading, error, refetch: fetchProject, updateProject }
}
