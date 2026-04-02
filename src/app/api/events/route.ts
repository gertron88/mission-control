import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Server-Sent Events endpoint for real-time updates
  // Agents connect here to receive tasks and send heartbeats
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}

`
      controller.enqueue(new TextEncoder().encode(data))
      
      // Keep connection alive
      const interval = setInterval(() => {
        const heartbeat = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}

`
        controller.enqueue(new TextEncoder().encode(heartbeat))
      }, 30000)
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST(request: NextRequest) {
  // Agents POST heartbeats and task updates here
  const body = await request.json()
  
  // TODO: Update agent status in database
  // TODO: Broadcast to dashboard via event bus
  
  return Response.json({ success: true })
}
