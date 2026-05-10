/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * In-memory EventBus — lightweight Pub/Sub based on native Node.js EventEmitter.
 *
 * Architecture Business OS :
 * API endpoint → validate → publish(DomainEvent) → handlers react
 *
 * The bus is LOCAL to the VPS — no tenantId, each instance is single-tenant.
 * Handlers are fire-and-forget: a failing handler doesn't block others.
 *
 * No external queue for now — sufficient for the current scope.
 * Migration to Redis/BullMQ possible without changing the interface.
 */

import { EventEmitter } from 'node:events'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  /** Identifiant unique de l'événement (UUID v4) */
  id: string
  /** Event name (e.g., 'quote.requested') */
  name: string
  /** ISO timestamp of emission */
  timestamp: string
  /** Typed payload specific to the event */
  payload: T
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void

// ── Bus singleton ──────────────────────────────────────────────────────────

class EventBus {
  private emitter = new EventEmitter()

  constructor() {
    // No listener limit — each event can have N handlers
    this.emitter.setMaxListeners(50)
  }

  /**
   * Publishes an event. Handlers are called **sequentially** in
   * the order they subscribed — necessary for handlers that
   * enrichissent l'event (ex: SaveToDatabaseHandler injecte
   * read `_quoteRequestId` that NotifyCustomerHandler/NotifyAdminHandler use
   * to generate the Q-{id} reference in the email — incidents from 2026-05-05 where
   * the old parallel dispatch produced `Q-pending` systematically).
   *
   * Fire-and-forget on the caller side: we don't wait for the chain to complete before
   * returning — we launch the chain in the background. An error in a
   * handler does NOT block the following ones (each step is try/catch).
   */
  publish<T>(event: DomainEvent<T>): void {
    const handlers = this.emitter.listeners(event.name) as EventHandler<T>[]
    // Détache la chaîne — submit.post.ts retourne immédiatement.
    void (async () => {
      for (const handler of handlers) {
        try {
          await handler(event)
        } catch (err: any) {
          console.error(`[EventBus] Handler error on '${event.name}':`, err?.message || err)
          // Continue avec les handlers suivants (résilience).
        }
      }
    })()
  }

  /**
   * Registers a handler for an event type.
   */
  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    this.emitter.on(eventName, handler as EventHandler)
    console.log(`[EventBus] Handler registered for '${eventName}'`)
  }

  /**
   * Number of handlers registered for an event (useful for tests).
   */
  listenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName)
  }
}

/** Singleton — une seule instance par process Nitro, accessible via globalThis */
export const eventBus = new EventBus()

// Expose on globalThis for access from any Nitro module
;(globalThis as any).eventBus = eventBus
