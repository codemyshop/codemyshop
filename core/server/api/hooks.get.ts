

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
