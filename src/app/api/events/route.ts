/**
 * Events API - Server-Sent Events for real-time updates
 * 
 * GET /api/events - SSE stream for real-time updates
 * POST /api/events - Publish events (internal use)
 * 
 * Query params:
 * - since: timestamp (ms) - replay events since this time
 */

import { NextRequest } from 'next/server'
import { eventBus } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}

`
      controller.enqueue(encoder.encode(data))
      
      // Replay historical events if requested
      if (since) {
        const sinceTime = parseInt(since, 10)
        if (!isNaN(sinceTime)) {
          const history = eventBus.getHistory(sinceTime)
          for (const event of history) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}

`))
            } catch (error) {
              console.error('Failed to replay event:', error)
            }
          }
        }
      }
      
      // Subscribe to new events
      const unsubscribe = eventBus.subscribe((eventData) => {
        try {
          controller.enqueue(encoder.encode(`data: ${eventData}

`))
        } catch (error) {
          console.error('Failed to send SSE:', error)
          unsubscribe()
        }
      })
      
      // Keep connection alive with ping every 30s
      const interval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}

`
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          clearInterval(interval)
          unsubscribe()
        }
      }, 30000)
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        unsubscribe()
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

export async function POST(request: NextRequest) {
  // Internal endpoint for publishing events
  // Verify authorization
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  
  if (auth !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const event = await request.json()
    eventBus.broadcast(event)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Invalid event data' }, { status: 400 })
  }
}
