/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/merchandising/search-product?q=...
 *
 * Search for an active product by id (numeric) OR reference (LIKE) OR name (LIKE).
 * Returns max 20 results. Used by the 'Add by ref/id…' bar
 * of the merchandising view.
 */
export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)
  const query = String(q || '').trim()
  if (query.length < 2) return { ok: true, products: [] }

  const db = useClientDb(event)
  const isNumeric = /^\d+$/.test(query)

  // Tokenisation : "huile olive" → ["huile","olive"] AND-és, pour matcher
  // "Huile d'olive Crète" (apostrophe entre les tokens). ILIKE car PG est
  // case-sensitive sur LIKE (≠ MariaDB ci par défaut).
  const tokens = query.split(/\s+/).filter(Boolean)
  const tokenClauses = tokens.map(() => '(p.reference ILIKE ? OR pl.name ILIKE ?)').join(' AND ')
  const tokenParams: any[] = []
  for (const t of tokens) {
    const lk = `%${t}%`
    tokenParams.push(lk, lk)
  }

  let rows: any[]
  if (isNumeric) {
    rows = await db.query(`
      SELECT p.id_product AS id,
             pl.name,
             p.reference,
             (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS image_id,
             pl.link_rewrite
        FROM ps_product p
        JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
       WHERE p.active = 1
         AND (p.id_product = ? OR ${tokenClauses})
       ORDER BY (p.id_product = ?) DESC, (p.reference = ?) DESC, pl.name ASC
       LIMIT 20
    `, [Number(query), ...tokenParams, Number(query), query])
  } else {
    rows = await db.query(`
      SELECT p.id_product AS id,
             pl.name,
             p.reference,
             (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS image_id,
             pl.link_rewrite
        FROM ps_product p
        JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
       WHERE p.active = 1
         AND ${tokenClauses}
       ORDER BY (p.reference = ?) DESC, pl.name ASC
       LIMIT 20
    `, [...tokenParams, query])
  }

  return { ok: true, products: rows }
})
