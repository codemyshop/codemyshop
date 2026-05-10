/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/stats/products?clientId=...&limit=10
 * Top products by sales (90 days). Direct DB access (principle 'Zero webservice
 * PrestaShop » 2026-04-22).
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { clientId, limit } = getQuery(event) as Record<string, string>
  const lim = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    const rows = await db.query<any>(
      `SELECT od.product_id AS id,
              od.product_name AS name,
              od.product_reference AS reference,
              SUM(od.product_quantity) AS quantitySold,
              SUM(od.total_price_tax_incl) AS revenue
         FROM ps_order_detail od
         JOIN ps_orders o ON o.id_order = od.id_order
        WHERE o.valid = 1
          AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY od.product_id, od.product_name, od.product_reference
        ORDER BY quantitySold DESC
        LIMIT ?`,
      [lim],
    )
    return rows.map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || ''),
      reference: String(r.reference || ''),
      quantitySold: Number(r.quantitySold || 0),
      revenue: Math.round(Number(r.revenue || 0) * 100) / 100,
    }))
  } catch (err: any) {
    console.error('[bo/stats/products] DB error:', err?.message)
    return []
  }
})
