/**
 *
 * Hook facade — consumed by /api/hooks (Nuxt) and any internal consumer that
 * needs to know the components attached to a target (page/cms/category/
 * product). Source of truth: `cs_hook`, owned by the ac_hook module.
 *
 * 100% PostgreSQL (cs_main.cs_hook).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export type HookTargetType = 'page' | 'cms' | 'category' | 'product' | (string & {})
export type HookSlot = 'before_content' | 'main' | 'after_content' | 'sidebar' | (string & {})

export interface HookItem {
  id: number
  name: string
  targetType: string
  targetId: string
  slot: string
  component: string
  moduleName: string
  position: number
}

interface HookContext {
  event?: any
  clientId?: string
}

/**
 * Lists active hooks for a target. Optional `slot` filter.
 * Tri : slot ASC, position ASC, id_hook ASC.
 */
export async function listHooksForTarget(
  targetType: HookTargetType,
  targetId: string,
  slot: HookSlot | null = null,
  _ctx: HookContext = {},
): Promise<HookItem[]> {
  const slotClause = slot ? sql`AND slot = ${slot}` : sql``
  const rows = await usePocPg().execute<any>(sql`
    SELECT id_hook, hook_name, target_type, target_id, slot, component,
           module_name, position
      FROM cs_main.cs_hook
     WHERE active = 1 AND target_type = ${targetType} AND target_id = ${targetId}
           ${slotClause}
     ORDER BY slot ASC, position ASC, id_hook ASC
  `)
  return (rows as any[]).map((r) => ({
    id: Number(r.id_hook),
    name: r.hook_name,
    targetType: r.target_type,
    targetId: r.target_id,
    slot: r.slot,
    component: r.component,
    moduleName: r.module_name,
    position: Number(r.position) || 0,
  }))
}
