'use client'

import { useEffect, useState } from 'react'

interface EventData {
  type: string
  [key: string]: unknown
}

export function useEventSource(url: string) {
  const [data, setData] = useState<EventData | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        setData(parsed)
      } catch {
        // Keepalive or non-JSON message
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      setError(new Error('EventSource connection failed'))
    }

    return () => {
      eventSource.close()
    }
  }, [url])

  return { data, connected, error }
}
