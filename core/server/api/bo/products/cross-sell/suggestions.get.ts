

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const minCo = Math.max(1, Math.min(50, Number(q.minCoOccurrences || 2)))
  const limit = Math.max(10, Math.min(500, Number(q.limit || 100)))
  const db = useClientDb(event)

  try {
    
    
    
    
    const pairs = await db.query<any>(`
      WITH pair_counts AS (
        SELECT
          LEAST(od1.product_id, od2.product_id)                AS src,
          GREATEST(od1.product_id, od2.product_id)             AS dst,
          COUNT(DISTINCT od1.id_order)                         AS co_count
        FROM ps_order_detail od1
        JOIN ps_order_detail od2
          ON od1.id_order = od2.id_order
         AND od1.product_id < od2.product_id
        JOIN ps_orders o
          ON o.id_order = od1.id_order
         AND o.valid = 1
        WHERE od1.product_id > 0 AND od2.product_id > 0
        GROUP BY src, dst
        HAVING COUNT(DISTINCT od1.id_order) >= ?
      ),
      src_totals AS (
        SELECT od.product_id AS src, COUNT(DISTINCT od.id_order) AS src_total
        FROM ps_order_detail od
        JOIN ps_orders o ON o.id_order = od.id_order AND o.valid = 1
        WHERE od.product_id > 0
        GROUP BY od.product_id
      )
      SELECT
        pc.src,
        pc.dst,
        pc.co_count                                                AS coCount,
        st.src_total                                               AS srcTotal,
        pls.name                                                   AS srcName,
        pld.name                                                   AS dstName,
        ROUND((pc.co_count / NULLIF(st.src_total, 0)) * 100, 1)    AS confidence
      FROM pair_counts pc
      JOIN ps_product      ps  ON ps.id_product = pc.src AND ps.active = 1
      JOIN ps_product      pd  ON pd.id_product = pc.dst AND pd.active = 1
      LEFT JOIN src_totals      st  ON st.src = pc.src
      LEFT JOIN ps_product_lang pls ON pls.id_product = pc.src AND pls.id_lang = 1
      LEFT JOIN ps_product_lang pld ON pld.id_product = pc.dst AND pld.id_lang = 1
      LEFT JOIN ps_accessory    a   ON (a.id_product_1 = pc.src AND a.id_product_2 = pc.dst)
                                    OR (a.id_product_1 = pc.dst AND a.id_product_2 = pc.src)
      WHERE a.id_product_1 IS NULL
      ORDER BY pc.co_count DESC, pc.src ASC
      LIMIT ?
    `, [minCo, limit])

    return {
      minCoOccurrences: minCo,
      total: pairs.length,
      suggestions: pairs.map(p => ({
        src:        Number(p.src),
        srcName:    p.srcName || `Produit #${p.src}`,
        dst:        Number(p.dst),
        dstName:    p.dstName || `Produit #${p.dst}`,
        coCount:    Number(p.coCount),
        srcTotal:   Number(p.srcTotal || 0),
        confidence: Number(p.confidence || 0),
      })),
    }
  } catch (err: any) {
    console.error('[bo/products/cross-sell/suggestions] DB error:', err?.message)
    return { minCoOccurrences: minCo, total: 0, suggestions: [] }
  }
})
