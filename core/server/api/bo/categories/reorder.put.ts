/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * PUT /api/bo/categories/reorder
 *
 * Reorders two sibling categories via drag & drop.
 *
 * Body : { draggedId: number, targetId: number, placement?: 'before' | 'after' }
 *
 * The server loads the complete sibling list from the database
 * and recalculates the order — the client doesn't need to have the entire
 * sibling set loaded (avoids 422 errors when perPage truncates the listing).
 *
 * Garde-fous :
 * - draggedId and targetId must exist.
 * - They must have the same id_parent (no reparenting via drag).
 * - The hierarchical order of the listing is calculated via CTE on (id_parent,
 * position) — no need to rebuild ntree on the backend.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody<{
    draggedId?: number
    targetId?: number
    placement?: 'before' | 'after'
  }>(event)

  const draggedId = Number(body?.draggedId)
  const targetId = Number(body?.targetId)
  const placement = body?.placement === 'after' ? 'after' : 'before'

  if (!draggedId || !targetId || draggedId === targetId) {
    throw createError({ statusCode: 422, message: 'draggedId et targetId requis et distincts' })
  }

  const d = usePocPg()

  const rowsResult: any = await d.execute(sql`
    SELECT id_category, id_parent FROM cs_main.ps_category WHERE id_category IN (${draggedId}, ${targetId})
  `)
  const rows = ((rowsResult as any) as any[]) ?? []
  if (rows.length !== 2) {
    throw createError({ statusCode: 404, message: 'draggedId ou targetId introuvable' })
  }
  const dragged = rows.find((r: any) => Number(r.id_category) === draggedId)
  const target = rows.find((r: any) => Number(r.id_category) === targetId)
  if (Number(dragged.id_parent) !== Number(target.id_parent)) {
    throw createError({ statusCode: 422, message: 'draggedId et targetId doivent avoir le même parent' })
  }
  const parentId = Number(dragged.id_parent)

  const siblingsResult: any = await d.execute(sql`
    SELECT id_category FROM cs_main.ps_category WHERE id_parent = ${parentId} ORDER BY position, id_category
  `)
  const siblings = ((siblingsResult as any) as any[]) ?? []
  const ids = siblings.map((r: any) => Number(r.id_category)).filter((id: number) => id !== draggedId)
  const targetIdx = ids.indexOf(targetId)
  if (targetIdx === -1) {
    throw createError({ statusCode: 500, message: 'Incohérence : target absent de la fratrie' })
  }
  const insertAt = placement === 'after' ? targetIdx + 1 : targetIdx
  ids.splice(insertAt, 0, draggedId)

  for (let i = 0; i < ids.length; i++) {
    await d.execute(sql`
      UPDATE cs_main.ps_category SET position = ${i}, date_upd = NOW() WHERE id_category = ${ids[i]} AND id_parent = ${parentId}
    `)
  }

  return { success: true, parentId, count: ids.length }
})
