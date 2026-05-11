

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { limit, filter } = getQuery(event) as Record<string, string>
  const db = useClientDb(event)

  try {
    let where = 'WHERE sa.id_product_attribute = 0'
    if (filter === 'low') where += ' AND sa.quantity > 0 AND sa.quantity < 5'
    else if (filter === 'out') where += ' AND sa.quantity <= 0'

    const stocks = await db.query<any>(`
      SELECT
        sa.id_stock_available AS id,
        sa.id_product         AS productId,
        sa.id_product_attribute AS combinationId,
        sa.quantity,
        sa.out_of_stock       AS outOfStock,
        COALESCE(pl.name, CONCAT('Produit #', sa.id_product)) AS productName,
        p.reference
      FROM ps_stock_available sa
      JOIN ps_product p ON p.id_product = sa.id_product
      LEFT JOIN ps_product_lang pl ON pl.id_product = sa.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
      ${where}
      ORDER BY sa.quantity ASC, pl.name ASC
      LIMIT ?
    `, [Number(limit || 200)])

    const summary = await db.get<any>(`
      SELECT
        COUNT(DISTINCT sa.id_product) AS totalProducts,
        SUM(CASE WHEN sa.quantity <= 0 THEN 1 ELSE 0 END) AS outOfStock,
        SUM(CASE WHEN sa.quantity > 0 AND sa.quantity < 5 THEN 1 ELSE 0 END) AS lowStock
      FROM ps_stock_available sa
      WHERE sa.id_product_attribute = 0
    `)

    return {
      stocks,
      total: stocks.length,
      summary: summary ?? { totalProducts: 0, outOfStock: 0, lowStock: 0 },
    }
  } catch (err: any) {
    console.error('[bo/stock] DB error:', err?.message)
    return { stocks: [], total: 0, summary: { totalProducts: 0, outOfStock: 0, lowStock: 0 } }
  }
})
