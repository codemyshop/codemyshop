/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * PUT /api/bo/merchandising/reorder
 * Body : { id_category: int, ordered_ids: int[] }
 *
 * UPDATE ps_category_product.position for each tuple (id_category, id_product)
 * according to the provided order. position = index in the array.
 *
 * If an id_product does not yet exist in the category (case of reassignment from orphan or
 * another category), INSERT at the target position. Idempotent.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ id_category?: number; ordered_ids?: number[] }>(event)
  const idCat = Number(body?.id_category)
  const ordered = Array.isArray(body?.ordered_ids) ? body!.ordered_ids.map(Number).filter(Boolean) : []
  if (!idCat || !ordered.length) {
    throw createError({ statusCode: 400, message: 'id_category et ordered_ids requis' })
  }

  const db = useClientDb(event)

  // Une seule transaction pour atomicité (CASE WHEN sur position)
  const cases = ordered.map((id, idx) => `WHEN ${Number(id)} THEN ${idx}`).join(' ')
  const ids = ordered.map(Number).join(',')

  // INSERT IGNORE pour les nouveaux entrants (drop depuis orphan/autre cat)
  const insertValues = ordered.map((id, idx) => `(${idCat}, ${Number(id)}, ${idx})`).join(', ')
  await db.run(
    `INSERT IGNORE INTO ps_category_product (id_category, id_product, position) VALUES ${insertValues}`,
  )

  // UPDATE des positions pour les rows existants
  await db.run(
    `UPDATE ps_category_product
        SET position = CASE id_product ${cases} END
      WHERE id_category = ?
        AND id_product IN (${ids})`,
    [idCat],
  )

  return { ok: true, id_category: idCat, count: ordered.length }
})
