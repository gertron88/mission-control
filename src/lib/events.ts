// Simple in-memory event bus for Server-Sent Events
// For production, consider Redis Pub/Sub

type EventCallback = (data: unknown) => void

interface Event {
  type: string
  [key: string]: unknown
}

class EventBus {
  private clients: Map<string, EventCallback> = new Map()
  private clientId = 0

  subscribe(callback: EventCallback): () => void {
    const id = (++this.clientId).toString()
    this.clients.set(id, callback)
    
    return () => {
      this.clients.delete(id)
    }
  }

  broadcast(event: Event) {
    const data = JSON.stringify(event)
    this.clients.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error('Failed to send event to client:', error)
      }
    })
  }
}

export const eventBus = new EventBus()

export function broadcastEvent(event: Event) {
  eventBus.broadcast(event)
}
