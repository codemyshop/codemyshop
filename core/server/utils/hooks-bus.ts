/**
 * Server-side hooks bus — `action*` and `filter*` primitives.
 *
 * PrestaShop hooks pattern adapted to Nuxt Nitro — codemyshop-oss
 * Phase 1 (2026-05-10). Modules subscribe to hooks emitted by the core
 * (ou d'autres modules) : actions = events fire-and-forget, filters =
 * data transformations.
 *
 * The `display*` hooks (Vue UI slots) are handled on the front-end by
 * `core/composables/useDisplaySlot.ts` (provideSlot/HookSlot).
 *
 * Compatible with existing EventBus (core/server/operations/bus/EventBus.ts) —
 * hooks-bus is lighter and generic, EventBus remains for domain events
 * typed (QuoteRequestedEvent, etc.).
 */

type ActionHandler<T = any> = (ctx: T) => Promise<void> | void
type FilterHandler<T = any> = (value: T, ctx?: any) => Promise<T> | T

const actionRegistry = new Map<string, Set<ActionHandler>>()
const filterRegistry = new Map<string, Set<FilterHandler>>()

/** Abonner un handler à une action hook. */
export function onAction<T = any>(name: string, handler: ActionHandler<T>): void {
  if (!actionRegistry.has(name)) actionRegistry.set(name, new Set())
  actionRegistry.get(name)!.add(handler as ActionHandler)
}

/** Emit an action hook. Fire-and-forget: all handlers are awaited, but a handler error doesn't stop the others. */
export async function callAction<T = any>(name: string, ctx: T): Promise<void> {
  const handlers = actionRegistry.get(name)
  if (!handlers || handlers.size === 0) return
  await Promise.allSettled(
    Array.from(handlers).map(async (h) => {
      try { await h(ctx) }
      catch (err: any) { console.error(`[hooks] action '${name}' handler failed:`, err?.message) }
    })
  )
}

/** Subscribe a handler to a filter hook. */
export function onFilter<T = any>(name: string, handler: FilterHandler<T>): void {
  if (!filterRegistry.has(name)) filterRegistry.set(name, new Set())
  filterRegistry.get(name)!.add(handler as FilterHandler)
}

/** Apply a filter hook: the value passes successively through each handler. */
export async function applyFilter<T = any>(name: string, value: T, ctx?: any): Promise<T> {
  const handlers = filterRegistry.get(name)
  if (!handlers || handlers.size === 0) return value
  let current = value
  for (const h of handlers) {
    try { current = await h(current, ctx) }
    catch (err: any) { console.error(`[hooks] filter '${name}' handler failed:`, err?.message) }
  }
  return current
}

/** Introspection (debug + admin) — list registered hooks. */
export function listRegisteredHooks(): { actions: string[], filters: string[] } {
  return {
    actions: Array.from(actionRegistry.keys()).sort(),
    filters: Array.from(filterRegistry.keys()).sort(),
  }
}
