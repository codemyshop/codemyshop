/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/merchandising/products?id_category=N
 *
 * Returns ALL active products linked to `id_category` (exact category, not the
 * subtree — we want precise control of the selected category).
 * No API-side pagination: frontend displays all with 'Page 1 / Page 2'
 * as a visual separator (see UI spec).
 */
export default defineEventHandler(async (event) => {
  const { id_category } = getQuery(event)
  const idCat = Number(id_category)
  if (!idCat || idCat < 1) {
    throw createError({ statusCode: 400, message: 'id_category requis' })
  }

  const db = useClientDb(event)

  const rows = await db.query<{
    id: number
    name: string
    reference: string | null
    image_id: number | null
    link_rewrite: string | null
    position: number
  }>(`
    SELECT p.id_product AS id,
           pl.name,
           p.reference,
           (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS image_id,
           pl.link_rewrite,
           cp.position
      FROM ps_category_product cp
      JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1
      JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
     WHERE cp.id_category = ?
     ORDER BY cp.position ASC, pl.name ASC
  `, [idCat])

  return { ok: true, products: rows, total: rows.length }
})
