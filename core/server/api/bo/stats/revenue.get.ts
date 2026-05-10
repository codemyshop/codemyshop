/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/stats/revenue?clientId=...
 * Revenue stats day/week/month. Direct DB access (principle 'Zero webservice
 * PrestaShop » 2026-04-22). Refacto depuis connector.getRevenueStats.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    // 4 agrégations en 1 SQL via conditions SUM(CASE WHEN ...)
    const row = await db.get<any>(
      `SELECT
          SUM(CASE WHEN DATE(date_add) = CURDATE()                         THEN total_paid_tax_incl ELSE 0 END) AS today,
          SUM(CASE WHEN date_add >= DATE_SUB(NOW(), INTERVAL 7 DAY)        THEN total_paid_tax_incl ELSE 0 END) AS week,
          SUM(CASE WHEN date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY)       THEN total_paid_tax_incl ELSE 0 END) AS month,
          SUM(total_paid_tax_incl)                                          AS total,
          SUM(CASE WHEN DATE(date_add) = CURDATE()                         THEN 1 ELSE 0 END) AS ordersToday,
          SUM(CASE WHEN date_add >= DATE_SUB(NOW(), INTERVAL 7 DAY)        THEN 1 ELSE 0 END) AS ordersWeek,
          SUM(CASE WHEN date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY)       THEN 1 ELSE 0 END) AS ordersMonth,
          COUNT(*) AS ordersTotal
         FROM ps_orders
        WHERE valid = 1`,
    )
    const round = (n: number) => Math.round(Number(n || 0) * 100) / 100
    return {
      today: round(row?.today),
      week: round(row?.week),
      month: round(row?.month),
      total: round(row?.total),
      ordersToday: Number(row?.ordersToday || 0),
      ordersWeek: Number(row?.ordersWeek || 0),
      ordersMonth: Number(row?.ordersMonth || 0),
      ordersTotal: Number(row?.ordersTotal || 0),
    }
  } catch (err: any) {
    console.error('[bo/stats/revenue] DB error:', err?.message)
    return { today: 0, week: 0, month: 0, total: 0, ordersToday: 0, ordersWeek: 0, ordersMonth: 0, ordersTotal: 0 }
  }
})
