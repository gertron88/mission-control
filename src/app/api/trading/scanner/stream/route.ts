import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"CONNECTED"}\n\n'));
      
      // Subscribe to events
      const unsubscribe = eventBus.subscribe((data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          // Client disconnected
          unsubscribe();
        }
      });
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
