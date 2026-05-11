

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const monthly = await db.query<any>(`
      SELECT
        DATE_FORMAT(date_add, '%Y-%m')                                                AS ym,
        DATE_FORMAT(date_add, '%b %Y')                                                AS label,
        COUNT(*)                                                                      AS orders,
        ROUND(COALESCE(SUM(total_paid_tax_excl), 0), 2)                               AS revenueHT,
        ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)                               AS revenueTTC,
        ROUND(COALESCE(SUM(total_paid_tax_incl - total_paid_tax_excl), 0), 2)         AS tva
      FROM ps_orders
      WHERE valid = 1
        AND date_add >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 11 MONTH)
      GROUP BY ym, label
      ORDER BY ym DESC
    `)
    const ytd = await db.get<any>(`
      SELECT
        ROUND(COALESCE(SUM(total_paid_tax_excl), 0), 2)                               AS revenueHT,
        ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)                               AS revenueTTC,
        ROUND(COALESCE(SUM(total_paid_tax_incl - total_paid_tax_excl), 0), 2)         AS tva
      FROM ps_orders
      WHERE valid = 1 AND YEAR(date_add) = YEAR(NOW())
    `)
    return {
      monthly: monthly.map(m => ({
        ym: m.ym, label: m.label,
        orders: Number(m.orders),
        revenueHT: Number(m.revenueHT),
        revenueTTC: Number(m.revenueTTC),
        tva: Number(m.tva),
        rate: Number(m.revenueHT) > 0 ? Math.round((Number(m.tva) / Number(m.revenueHT)) * 1000) / 10 : 0,
      })),
      ytd: {
        revenueHT:  Number(ytd?.revenueHT || 0),
        revenueTTC: Number(ytd?.revenueTTC || 0),
        tva:        Number(ytd?.tva || 0),
      },
    }
  } catch (err: any) {
    console.error('[bo/finance/tva] DB error:', err?.message)
    return { monthly: [], ytd: { revenueHT: 0, revenueTTC: 0, tva: 0 } }
  }
})
