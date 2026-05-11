

type ActionHandler<T = any> = (ctx: T) => Promise<void> | void
type FilterHandler<T = any> = (value: T, ctx?: any) => Promise<T> | T

const actionRegistry = new Map<string, Set<ActionHandler>>()
const filterRegistry = new Map<string, Set<FilterHandler>>()

export function onAction<T = any>(name: string, handler: ActionHandler<T>): void {
  if (!actionRegistry.has(name)) actionRegistry.set(name, new Set())
  actionRegistry.get(name)!.add(handler as ActionHandler)
}

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

export function onFilter<T = any>(name: string, handler: FilterHandler<T>): void {
  if (!filterRegistry.has(name)) filterRegistry.set(name, new Set())
  filterRegistry.get(name)!.add(handler as FilterHandler)
}

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

export function listRegisteredHooks(): { actions: string[], filters: string[] } {
  return {
    actions: Array.from(actionRegistry.keys()).sort(),
    filters: Array.from(filterRegistry.keys()).sort(),
  }
}
