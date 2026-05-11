

import { EventEmitter } from 'node:events'

export interface DomainEvent<T = unknown> {
  
  id: string
  
  name: string
  
  timestamp: string
  
  payload: T
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void

class EventBus {
  private emitter = new EventEmitter()

  constructor() {
    
    this.emitter.setMaxListeners(50)
  }

  

  publish<T>(event: DomainEvent<T>): void {
    const handlers = this.emitter.listeners(event.name) as EventHandler<T>[]
    
    void (async () => {
      for (const handler of handlers) {
        try {
          await handler(event)
        } catch (err: any) {
          console.error(`[EventBus] Handler error on '${event.name}':`, err?.message || err)
          
        }
      }
    })()
  }

  

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    this.emitter.on(eventName, handler as EventHandler)
    console.log(`[EventBus] Handler registered for '${eventName}'`)
  }

  

  listenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName)
  }
}

export const eventBus = new EventBus()

;(globalThis as any).eventBus = eventBus
