// WebSocket server placeholder
// Note: Socket.io requires persistent connections not available on Vercel serverless
// For production, use Pusher, Ably, or a separate WebSocket server

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'WebSocket server not available on Vercel serverless. Use SSE endpoint /api/events instead.' 
  })
}
