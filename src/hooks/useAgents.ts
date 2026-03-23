'use client'

import { useEffect, useState } from 'react'

interface Agent {
  id: string
  handle: string
  name: string
  role: string
  status: string
  currentLoad: number
  maxLoad: number
  capabilities: string[]
  trustLevel: number
  lastSeenAt?: string
  _count?: {
    assignedTasks: number
  }
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents?includeOffline=true')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return { agents, loading, error, refetch: fetchAgents }
}
