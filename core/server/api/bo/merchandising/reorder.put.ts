

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id_category?: number; ordered_ids?: number[] }>(event)
  const idCat = Number(body?.id_category)
  const ordered = Array.isArray(body?.ordered_ids) ? body!.ordered_ids.map(Number).filter(Boolean) : []
  if (!idCat || !ordered.length) {
    throw createError({ statusCode: 400, message: 'id_category et ordered_ids requis' })
  }

  const db = useClientDb(event)

  
  const cases = ordered.map((id, idx) => `WHEN ${Number(id)} THEN ${idx}`).join(' ')
  const ids = ordered.map(Number).join(',')

  
  const insertValues = ordered.map((id, idx) => `(${idCat}, ${Number(id)}, ${idx})`).join(', ')
  await db.run(
    `INSERT IGNORE INTO ps_category_product (id_category, id_product, position) VALUES ${insertValues}`,
  )

  
  await db.run(
    `UPDATE ps_category_product
        SET position = CASE id_product ${cases} END
      WHERE id_category = ?
        AND id_product IN (${ids})`,
    [idCat],
  )

  return { ok: true, id_category: idCat, count: ordered.length }
})
