import { Server } from 'socket.io'
import { NextApiRequest } from 'next'
import { NextApiResponseServerIO } from '@/types/next'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Store io instance globally
let io: Server | null = null

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (res.socket.server.io) {
    console.log('Socket.io already running')
    res.end()
    return
  }

  console.log('Setting up Socket.io server...')
  
  io = new Server(res.socket.server as any, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Agent authentication middleware
  io.use(async (socket, next) => {
    const apiKey = socket.handshake.auth.apiKey
    const agentId = socket.handshake.auth.agentId
    
    if (!apiKey || !agentId) {
      return next(new Error('Authentication required'))
    }
    
    // Verify agent exists and API key matches
    // (In production, verify against database)
    socket.data.agentId = agentId
    socket.data.authenticated = true
    next()
  })

  io.on('connection', (socket) => {
    console.log(`Agent connected: ${socket.data.agentId}`)
    
    // Join agent's private room
    socket.join(`agent:${socket.data.agentId}`)
    
    // Handle heartbeat
    socket.on('heartbeat', (data) => {
      console.log(`Heartbeat from ${socket.data.agentId}:`, data)
      
      // Update agent status in database
      // Broadcast to dashboard clients
      socket.to('dashboard').emit('agent:heartbeat', {
        agentId: socket.data.agentId,
        ...data,
        timestamp: new Date().toISOString(),
      })
    })
    
    // Handle task completion
    socket.on('task:complete', (data) => {
      console.log(`Task completed by ${socket.data.agentId}:`, data)
      
      // Update task in database
      // Notify dashboard
      socket.to('dashboard').emit('task:completed', {
        agentId: socket.data.agentId,
        ...data,
      })
    })
    
    // Handle task progress
    socket.on('task:progress', (data) => {
      socket.to('dashboard').emit('task:progress', {
        agentId: socket.data.agentId,
        ...data,
      })
    })
    
    // Handle kill switch
    socket.on('kill', () => {
      console.log(`Kill command acknowledged by ${socket.data.agentId}`)
      socket.to('dashboard').emit('agent:killed', {
        agentId: socket.data.agentId,
        timestamp: new Date().toISOString(),
      })
    })
    
    socket.on('disconnect', () => {
      console.log(`Agent disconnected: ${socket.data.agentId}`)
      
      // Update agent status to OFFLINE
      socket.to('dashboard').emit('agent:offline', {
        agentId: socket.data.agentId,
        timestamp: new Date().toISOString(),
      })
    })
  })

  res.socket.server.io = io
  res.end()
}
