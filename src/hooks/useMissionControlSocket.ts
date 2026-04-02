import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface AgentSocketData {
  agentId: string
  status: string
  cpuUsage?: number
  memoryUsage?: number
  activeTaskCount?: number
  timestamp: string
}

interface TaskSocketData {
  taskId: string
  agentId: string
  status: string
  progress?: number
  result?: unknown
}

export function useMissionControlSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to WebSocket server
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
      auth: {
        // Dashboard clients use a special dashboard token
        dashboardToken: process.env.NEXT_PUBLIC_DASHBOARD_TOKEN,
      },
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Dashboard connected to Mission Control')
      socket.emit('join', 'dashboard')
    })

    socket.on('agent:heartbeat', (data: AgentSocketData) => {
      console.log('Agent heartbeat:', data)
      // Update agent status in UI
    })

    socket.on('agent:offline', (data: { agentId: string; timestamp: string }) => {
      console.log('Agent offline:', data)
      // Update agent status to OFFLINE
    })

    socket.on('task:progress', (data: TaskSocketData) => {
      console.log('Task progress:', data)
      // Update task progress in UI
    })

    socket.on('task:completed', (data: TaskSocketData) => {
      console.log('Task completed:', data)
      // Update task status in UI
    })

    socket.on('agent:killed', (data: { agentId: string; timestamp: string }) => {
      console.log('Agent killed:', data)
      // Show kill notification
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const sendTaskToAgent = (agentId: string, task: unknown) => {
    socketRef.current?.emit('task:assign', { agentId, task })
  }

  const killAgent = (agentId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = socketRef.current as any
    socket?.to(`agent:${agentId}`).emit('kill')
  }

  return {
    socket: socketRef.current,
    sendTaskToAgent,
    killAgent,
  }
}
