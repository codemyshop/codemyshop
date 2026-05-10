/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/bi/sales — sales KPIs, 12-month trend, top products, status distribution.
 * Query: ?period=7|30|90|365 (days), default 30.
 *
 * KPIs calculated over [now - period, now], compared to [now - 2*period, now - period].
 * Only orders with valid=1 (paid) count.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const periodDays = [7, 30, 90, 365].includes(Number(q.period)) ? Number(q.period) : 30
  const db = useClientDb(event)

  try {
    const [current, previous, monthly, topProducts, byStatus] = await Promise.all([
      // Période courante
      db.get<any>(`
        SELECT
          COUNT(*)                                AS orders,
          COALESCE(SUM(total_paid_tax_incl), 0)   AS revenue,
          COALESCE(SUM(total_paid_tax_excl), 0)   AS revenueHT,
          COALESCE(AVG(total_paid_tax_incl), 0)   AS avgCart
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [periodDays]),

      // Période précédente (pour delta)
      db.get<any>(`
        SELECT
          COUNT(*)                                AS orders,
          COALESCE(SUM(total_paid_tax_incl), 0)   AS revenue,
          COALESCE(SUM(total_paid_tax_excl), 0)   AS revenueHT,
          COALESCE(AVG(total_paid_tax_incl), 0)   AS avgCart
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND date_add <  DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [periodDays * 2, periodDays]),

      // Évolution 12 derniers mois
      db.query<any>(`
        SELECT
          DATE_FORMAT(date_add, '%Y-%m')              AS ym,
          DATE_FORMAT(date_add, '%b')                 AS label,
          COUNT(*)                                    AS orders,
          ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2) AS revenue
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 11 MONTH)
        GROUP BY ym, label
        ORDER BY ym ASC
      `),

      // Top 10 produits sur la période
      db.query<any>(`
        SELECT
          od.product_id                                     AS productId,
          od.product_name                                   AS name,
          SUM(od.product_quantity)                          AS qty,
          ROUND(SUM(od.total_price_tax_incl), 2)            AS revenue
        FROM ps_order_detail od
        JOIN ps_orders o ON o.id_order = od.id_order
        WHERE o.valid = 1
          AND o.date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY od.product_id, od.product_name
        ORDER BY revenue DESC
        LIMIT 10
      `, [periodDays]),

      // Répartition par statut (toutes commandes sur la période, pas seulement valid=1)
      db.query<any>(`
        SELECT
          o.current_state                                   AS statusId,
          COALESCE(osl.name, CONCAT('État #', o.current_state)) AS name,
          os.color                                          AS color,
          COUNT(*)                                          AS count,
          ROUND(COALESCE(SUM(o.total_paid_tax_incl), 0), 2) AS revenue
        FROM ps_orders o
        LEFT JOIN ps_order_state os      ON os.id_order_state = o.current_state
        LEFT JOIN ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
        WHERE o.date_add >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY o.current_state, osl.name, os.color
        ORDER BY count DESC
      `, [periodDays]),
    ])

    const trend = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0)

    return {
      period: periodDays,
      kpis: {
        revenue:   { current: Number(current?.revenue || 0),   previous: Number(previous?.revenue || 0),   trend: trend(Number(current?.revenue || 0),   Number(previous?.revenue || 0)) },
        revenueHT: { current: Number(current?.revenueHT || 0), previous: Number(previous?.revenueHT || 0), trend: trend(Number(current?.revenueHT || 0), Number(previous?.revenueHT || 0)) },
        orders:    { current: Number(current?.orders || 0),    previous: Number(previous?.orders || 0),    trend: trend(Number(current?.orders || 0),    Number(previous?.orders || 0)) },
        avgCart:   { current: Number(current?.avgCart || 0),   previous: Number(previous?.avgCart || 0),   trend: trend(Number(current?.avgCart || 0),   Number(previous?.avgCart || 0)) },
      },
      monthly: monthly.map(m => ({ label: m.label, ym: m.ym, orders: Number(m.orders), value: Number(m.revenue) })),
      topProducts: topProducts.map(p => ({ productId: p.productId, name: p.name, qty: Number(p.qty), revenue: Number(p.revenue) })),
      byStatus: byStatus.map(s => ({ statusId: s.statusId, name: s.name, color: s.color, count: Number(s.count), revenue: Number(s.revenue) })),
    }
  } catch (err: any) {
    console.error('[bo/bi/sales] DB error:', err?.message)
    return {
      period: periodDays,
      kpis: {
        revenue:   { current: 0, previous: 0, trend: 0 },
        revenueHT: { current: 0, previous: 0, trend: 0 },
        orders:    { current: 0, previous: 0, trend: 0 },
        avgCart:   { current: 0, previous: 0, trend: 0 },
      },
      monthly: [],
      topProducts: [],
      byStatus: [],
    }
  }
})
