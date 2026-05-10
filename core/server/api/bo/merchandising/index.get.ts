/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/merchandising — lists categories with product count
 * and merchandising indicators (top sellers in 30 days, stockouts).
 * Single query: LEFT JOIN ps_category_lang + product aggregates + sales.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  // Alias internes en snake_case (cf. fix cross-sell même session) — PG
  // lowercase les identifiants non-quotés. Le re-aliasing camelCase ne se
  // fait qu'au SELECT final, où l'adapter PG auto-quote (db-pg-adapter §2d).
  const rows = await db.query<any>(`
    SELECT
      c.id_category                  AS id,
      c.id_parent                    AS idParent,
      c.level_depth                  AS levelDepth,
      c.active,
      c.position,
      cl.name,
      cl.link_rewrite                AS slug,
      -- ::int : COUNT/SUM PG renvoient bigint → string côté driver, casse les arithmétiques JS.
      COALESCE(cp.nb_products, 0)::int    AS nbProducts,
      COALESCE(s.nb_sold_30d, 0)::int     AS nbSold30d,
      COALESCE(stk.nb_out_of_stock, 0)::int AS nbOutOfStock
    FROM ps_category c
    LEFT JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1
    LEFT JOIN (
      SELECT id_category, COUNT(*) AS nb_products
      FROM ps_category_product
      GROUP BY id_category
    ) cp ON cp.id_category = c.id_category
    LEFT JOIN (
      SELECT cp.id_category, SUM(od.product_quantity) AS nb_sold_30d
      FROM ps_order_detail od
      JOIN ps_orders o ON o.id_order = od.id_order
      JOIN ps_category_product cp ON cp.id_product = od.product_id
      WHERE o.date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND o.valid = 1
      GROUP BY cp.id_category
    ) s ON s.id_category = c.id_category
    LEFT JOIN (
      SELECT cp.id_category, COUNT(*) AS nb_out_of_stock
      FROM ps_category_product cp
      JOIN ps_stock_available sa ON sa.id_product = cp.id_product AND sa.id_product_attribute = 0
      WHERE sa.quantity <= 0
      GROUP BY cp.id_category
    ) stk ON stk.id_category = c.id_category
    WHERE c.id_category > 1
    ORDER BY c.level_depth ASC, cl.name ASC
  `)

  return { ok: true, categories: rows }
})
