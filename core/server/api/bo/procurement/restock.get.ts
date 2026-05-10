/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/procurement/restock — products to be restocked (stock ≤ threshold). */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const threshold = Math.max(0, Math.min(100, Number(q.threshold || 5)))
  const db = useClientDb(event)

  try {
    const products = await db.query<any>(`
      SELECT
        p.id_product                                      AS id,
        pl.name,
        p.reference,
        sa.quantity                                       AS stock,
        p.active,
        sup.name                                          AS supplierName,
        ROUND(p.price, 2)                                 AS price,
        (SELECT COALESCE(SUM(od.product_quantity), 0)
         FROM ps_order_detail od
         JOIN ps_orders o ON o.id_order = od.id_order
         WHERE od.product_id = p.id_product
           AND o.valid = 1
           AND o.date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY))   AS sold30
      FROM ps_product p
      JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
      LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
      LEFT JOIN ps_supplier sup       ON sup.id_supplier = p.id_supplier
      WHERE p.active = 1
        AND COALESCE(sa.quantity, 0) <= ?
      ORDER BY sold30 DESC, pl.name ASC
      LIMIT 100
    `, [threshold])

    return {
      threshold,
      total: products.length,
      products: products.map((p: any) => ({
        id: p.id, name: p.name, reference: p.reference,
        stock: Number(p.stock || 0),
        supplierName: p.supplierName,
        price: Number(p.price || 0),
        sold30: Number(p.sold30 || 0),
        daysRemaining: Number(p.sold30) > 0 ? Math.round((Number(p.stock) / (Number(p.sold30) / 30)) * 10) / 10 : null,
      })),
    }
  } catch (err: any) {
    console.error('[bo/procurement/restock] DB error:', err?.message)
    return { threshold, total: 0, products: [] }
  }
})
