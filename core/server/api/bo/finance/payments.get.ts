/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/finance/payments — Breakdown by payment method over [N] days. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const periodDays = [7, 30, 90, 365].includes(Number(q.period)) ? Number(q.period) : 30
  const db = useClientDb(event)

  try {
    const [byMethod, totals, recentPayments] = await Promise.all([
      db.query<any>(`
        SELECT
          COALESCE(NULLIF(payment, ''), 'Inconnu')          AS method,
          COUNT(*)                                          AS count,
          ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)   AS revenue,
          ROUND(COALESCE(AVG(total_paid_tax_incl), 0), 2)   AS avgAmount
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY method
        ORDER BY revenue DESC
      `, [periodDays]),
      db.get<any>(`
        SELECT
          COUNT(*)                                          AS totalCount,
          ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)   AS totalRevenue
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [periodDays]),
      db.query<any>(`
        SELECT
          o.id_order                                        AS id,
          o.reference,
          o.payment                                         AS method,
          ROUND(o.total_paid_tax_incl, 2)                   AS amount,
          o.date_add                                        AS dateAdd,
          CONCAT(c.firstname, ' ', c.lastname)              AS customerName
        FROM ps_orders o
        LEFT JOIN ps_customer c ON c.id_customer = o.id_customer
        WHERE o.valid = 1
          AND o.date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY o.date_add DESC
        LIMIT 20
      `, [periodDays]),
    ])

    const total = Number(totals?.totalRevenue || 0)
    return {
      period: periodDays,
      totalCount: Number(totals?.totalCount || 0),
      totalRevenue: total,
      byMethod: byMethod.map(m => ({
        method:    m.method,
        count:     Number(m.count),
        revenue:   Number(m.revenue),
        avgAmount: Number(m.avgAmount),
        share:     total > 0 ? Math.round((Number(m.revenue) / total) * 1000) / 10 : 0,
      })),
      recentPayments: recentPayments.map(p => ({
        id:           p.id,
        reference:    p.reference,
        method:       p.method || 'Inconnu',
        amount:       Number(p.amount),
        dateAdd:      p.dateAdd,
        customerName: p.customerName,
      })),
    }
  } catch (err: any) {
    console.error('[bo/finance/payments] DB error:', err?.message)
    return { period: periodDays, totalCount: 0, totalRevenue: 0, byMethod: [], recentPayments: [] }
  }
})
