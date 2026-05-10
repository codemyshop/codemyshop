/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/products/search-boost/embeddings — L2 semantic KPIs.
 *
 * Reads `cs_product_embedding` (populated by the embedding pipeline `ac_embedder.py`,
 * Mistral mistral-embed 1024d) and `ps_configuration.AC_SEARCH_MODE` (mode
 * active consumed by /api/catalogue/search in the absence of `?mode=…`).
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  try {
    const [embedStats, totalProducts, modeRow] = await Promise.all([
      db.get<any>(`
        SELECT
          COUNT(*)                       AS total,
          COUNT(DISTINCT id_product)     AS indexed_products,
          COUNT(DISTINCT id_lang)        AS indexed_langs,
          MAX(date_upd)                  AS last_indexed_at,
          MAX(model)                     AS model
        FROM cs_product_embedding
      `).catch(() => null),
      db.get<any>(`
        SELECT COUNT(*) AS total
        FROM ps_product p
        JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
        WHERE p.active = 1 AND ps.active = 1
      `).catch(() => null),
      db.get<any>(`SELECT value FROM ps_configuration WHERE name = 'AC_SEARCH_MODE' LIMIT 1`)
        .catch(() => null),
    ])

    const indexedProducts = Number(embedStats?.indexed_products || 0)
    const totalActive     = Number(totalProducts?.total || 0)

    return {
      totalEmbeddings:  Number(embedStats?.total || 0),
      indexedProducts,
      indexedLangs:     Number(embedStats?.indexed_langs || 0),
      totalActiveProducts: totalActive,
      missingProducts:  Math.max(0, totalActive - indexedProducts),
      lastIndexedAt:    embedStats?.last_indexed_at || null,
      model:            embedStats?.model || null,
      dim:              1024,
      currentMode:      String(modeRow?.value || 'lex').toLowerCase(),
    }
  } catch (err: any) {
    console.error('[bo/products/search-boost/embeddings GET] DB error:', err?.message)
    return {
      totalEmbeddings: 0, indexedProducts: 0, indexedLangs: 0,
      totalActiveProducts: 0, missingProducts: 0,
      lastIndexedAt: null, model: null, dim: 1024, currentMode: 'lex',
    }
  }
})
