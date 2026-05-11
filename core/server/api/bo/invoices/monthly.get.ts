

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const q = getQuery(event) as Record<string, string>
  const months = Math.min(36, Math.max(1, Number(q.months || 12)))

  try {
    const issued = await db.query<any>(`
      SELECT
        DATE_FORMAT(issue_date, '%Y-%m')                              AS month,
        SUM(CASE WHEN status NOT IN ('cancelled', 'draft') THEN 1 ELSE 0 END) AS nb,
        ROUND(SUM(CASE WHEN status NOT IN ('cancelled', 'draft') THEN amount_ht  ELSE 0 END), 2) AS ht,
        ROUND(SUM(CASE WHEN status NOT IN ('cancelled', 'draft') THEN amount_ttc ELSE 0 END), 2) AS ttc,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)             AS draftCount,
        ROUND(SUM(CASE WHEN status = 'draft' THEN amount_ttc ELSE 0 END), 2) AS draftTtc
      FROM cs_invoice
      WHERE type <> 'avoir'
        AND issue_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
      ORDER BY month DESC
    `, [months])

    const paid = await db.query<any>(`
      SELECT
        DATE_FORMAT(paid_at, '%Y-%m')                                 AS month,
        COUNT(*)                                                      AS nb,
        ROUND(SUM(amount_ht), 2)                                      AS ht,
        ROUND(SUM(amount_ttc), 2)                                     AS ttc
      FROM cs_invoice
      WHERE status = 'paid'
        AND paid_at IS NOT NULL
        AND type <> 'avoir'
        AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
      ORDER BY month DESC
    `, [months])

    return { issued, paid }
  } catch (err: any) {
    console.error('[bo/invoices/monthly] DB error:', err?.message)
    return { issued: [], paid: [] }
  }
})
