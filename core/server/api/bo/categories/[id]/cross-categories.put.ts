

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const hostId = Number(getRouterParam(event, 'id'))
  if (!hostId || hostId < 1) {
    throw createError({ statusCode: 400, message: 'id catégorie invalide' })
  }

  const body = await readBody<{ ids?: unknown }>(event)
  const rawIds = Array.isArray(body?.ids) ? body!.ids! : []
  const ids = [...new Set(
    rawIds
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n > 0 && n !== hostId),
  )]

  const db = useClientDb(event)

  
  let validIds: number[] = []
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',')
    const rows = await db.query<{ id_category: number }>(
      `SELECT id_category FROM ps_category WHERE id_category IN (${placeholders})`,
      ids,
    )
    const existing = new Set(rows.map((r) => Number(r.id_category)))
    validIds = ids.filter((n) => existing.has(n))
  }

  
  await db.run(
    `DELETE FROM cs_category_cross WHERE id_category = ?`,
    [hostId],
  )

  for (let i = 0; i < validIds.length; i++) {
    await db.run(
      `INSERT INTO cs_category_cross (id_category, id_cross_category, position, date_add)
       VALUES (?, ?, ?, NOW())`,
      [hostId, validIds[i], i],
    )
  }

  return { success: true, hostId, count: validIds.length, ids: validIds }
})
