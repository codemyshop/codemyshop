/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/merchandising/orphans
 *
 * Returns active products with no `ps_category_product` association.
 * Used by the merchandising view for the 'uncategorized' column.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<{
    id: number
    name: string
    reference: string | null
    image_id: number | null
    link_rewrite: string | null
  }>(`
    SELECT p.id_product AS id,
           pl.name,
           p.reference,
           (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS image_id,
           pl.link_rewrite
      FROM ps_product p
      JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
      LEFT JOIN ps_category_product cp ON cp.id_product = p.id_product
     WHERE p.active = 1 AND cp.id_category IS NULL
     ORDER BY pl.name ASC
     LIMIT 500
  `)

  return { ok: true, products: rows, total: rows.length }
})
