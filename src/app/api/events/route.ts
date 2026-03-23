import { NextRequest } from 'next/server'
import { eventBus } from '@/lib/events'

// GET /api/events - Server-Sent Events endpoint
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"CONNECTED"}\n\n'))
      
      // Subscribe to events
      const unsubscribe = eventBus.subscribe((data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Client disconnected
          unsubscribe()
        }
      })
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
          unsubscribe()
        }
      }, 30000)
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        unsubscribe()
      })
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
