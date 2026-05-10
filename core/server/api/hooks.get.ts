/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hooks
 * Lists active hooks on a target (page/cms/category/product).
 *
 * Query params :
 *   target_type  — page | cms | category | product  (obligatoire)
 * target_id    — slug or id of the target (required)
 *   slot         — before_content | main | after_content | sidebar (optionnel, filtre)
 *
 * Source: cs_hook (PS module ac_hook). Read via Drizzle facade —
 * cf. core/modules/hook/server/utils/hook.ts.
 */
import { listHooksForTarget } from '~/modules/hook/server/utils/hook'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetType = String(query.target_type || '').trim()
  const targetId = String(query.target_id || '').trim()
  const slot = query.slot ? String(query.slot).trim() : null

  if (!targetType || !targetId) {
    return { hooks: [], error: 'target_type and target_id required' }
  }

  try {
    const items = await listHooksForTarget(targetType, targetId, slot, { event })
    return {
      hooks: items.map(it => ({
        id: it.id,
        name: it.name,
        targetType: it.targetType,
        targetId: it.targetId,
        slot: it.slot,
        component: it.component,
        moduleName: it.moduleName,
        position: it.position,
      })),
    }
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146) {
      console.error('[API hooks] DB error:', err?.message)
    }
    return { hooks: [], error: 'DB unavailable' }
  }
})
