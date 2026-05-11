

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  try {
    const [cohortSizes, retention, ltvRows, rfm] = await Promise.all([
      
      db.query<any>(`
        WITH first_order AS (
          SELECT id_customer, DATE_FORMAT(MIN(date_add), '%Y-%m') AS cohort
          FROM ps_orders
          WHERE valid = 1
          GROUP BY id_customer
        )
        SELECT cohort, COUNT(*) AS size
        FROM first_order
        WHERE cohort >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 11 MONTH), '%Y-%m')
        GROUP BY cohort
        ORDER BY cohort ASC
      `),

      
      db.query<any>(`
        WITH first_order AS (
          SELECT id_customer, DATE_FORMAT(MIN(date_add), '%Y-%m') AS cohort
          FROM ps_orders
          WHERE valid = 1
          GROUP BY id_customer
        )
        SELECT
          fo.cohort                                                                  AS cohort,
          PERIOD_DIFF(DATE_FORMAT(o.date_add, '%Y%m'), REPLACE(fo.cohort, '-', ''))  AS monthDelta,
          COUNT(DISTINCT o.id_customer)                                              AS activeCustomers,
          ROUND(COALESCE(SUM(o.total_paid_tax_incl), 0), 2)                          AS revenue
        FROM first_order fo
        JOIN ps_orders o
          ON o.id_customer = fo.id_customer
         AND o.valid = 1
        WHERE fo.cohort >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 11 MONTH), '%Y-%m')
        GROUP BY fo.cohort, monthDelta
        ORDER BY fo.cohort ASC, monthDelta ASC
      `),

      
      db.query<any>(`
        WITH first_order AS (
          SELECT id_customer, DATE_FORMAT(MIN(date_add), '%Y-%m') AS cohort
          FROM ps_orders
          WHERE valid = 1
          GROUP BY id_customer
        )
        SELECT
          fo.cohort                                                    AS cohort,
          COUNT(DISTINCT fo.id_customer)                               AS size,
          ROUND(COALESCE(SUM(o.total_paid_tax_incl), 0), 2)            AS totalRevenue,
          ROUND(COALESCE(SUM(o.total_paid_tax_incl), 0)
            / NULLIF(COUNT(DISTINCT fo.id_customer), 0), 2)            AS ltv
        FROM first_order fo
        LEFT JOIN ps_orders o
          ON o.id_customer = fo.id_customer
         AND o.valid = 1
        WHERE fo.cohort >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 11 MONTH), '%Y-%m')
        GROUP BY fo.cohort
        ORDER BY fo.cohort ASC
      `),

      
      db.query<any>(`
        WITH cust_stats AS (
          SELECT
            id_customer,
            DATEDIFF(NOW(), MAX(date_add))            AS recencyDays,
            COUNT(*)                                  AS frequency,
            COALESCE(SUM(total_paid_tax_incl), 0)     AS monetary
          FROM ps_orders
          WHERE valid = 1
          GROUP BY id_customer
        )
        SELECT
          SUM(CASE WHEN recencyDays <= 30  AND frequency >= 3 AND monetary >= 200 THEN 1 ELSE 0 END) AS champions,
          SUM(CASE WHEN recencyDays <= 90  AND frequency >= 2 AND NOT (recencyDays <= 30 AND frequency >= 3 AND monetary >= 200) THEN 1 ELSE 0 END) AS loyal,
          SUM(CASE WHEN recencyDays <= 30  AND frequency = 1 THEN 1 ELSE 0 END)  AS newbies,
          SUM(CASE WHEN recencyDays BETWEEN 91 AND 180 AND frequency >= 2 THEN 1 ELSE 0 END) AS atRisk,
          SUM(CASE WHEN recencyDays > 180 THEN 1 ELSE 0 END) AS lost,
          SUM(CASE WHEN recencyDays BETWEEN 31 AND 90 AND frequency = 1 THEN 1 ELSE 0 END) AS dormant,
          COUNT(*) AS total
        FROM cust_stats
      `),
    ])

    
    type CellRaw = { cohort: string; monthDelta: number; activeCustomers: number; revenue: number }
    const byCohort: Record<string, CellRaw[]> = {}
    for (const r of retention as CellRaw[]) {
      const key = r.cohort
      if (!byCohort[key]) byCohort[key] = []
      byCohort[key].push({
        cohort: key,
        monthDelta: Number(r.monthDelta),
        activeCustomers: Number(r.activeCustomers),
        revenue: Number(r.revenue),
      })
    }

    const matrix = (cohortSizes as any[]).map(c => {
      const size  = Number(c.size || 0)
      const cells = byCohort[c.cohort] || []
      return {
        cohort: c.cohort,
        size,
        cells: cells.map(x => ({
          monthDelta: x.monthDelta,
          active: x.activeCustomers,
          retention: size > 0 ? Math.round((x.activeCustomers / size) * 1000) / 10 : 0,
          revenue: x.revenue,
        })),
      }
    })

    const rfmRow = (rfm as any[])[0] || {}

    return {
      cohorts: matrix,
      ltv: (ltvRows as any[]).map(l => ({
        cohort: l.cohort,
        size: Number(l.size || 0),
        totalRevenue: Number(l.totalRevenue || 0),
        ltv: Number(l.ltv || 0),
      })),
      rfm: {
        champions: Number(rfmRow.champions || 0),
        loyal:     Number(rfmRow.loyal || 0),
        newbies:   Number(rfmRow.newbies || 0),
        atRisk:    Number(rfmRow.atRisk || 0),
        dormant:   Number(rfmRow.dormant || 0),
        lost:      Number(rfmRow.lost || 0),
        total:     Number(rfmRow.total || 0),
      },
    }
  } catch (err: any) {
    console.error('[bo/bi/cohorts] DB error:', err?.message)
    return {
      cohorts: [],
      ltv: [],
      rfm: { champions: 0, loyal: 0, newbies: 0, atRisk: 0, dormant: 0, lost: 0, total: 0 },
    }
  }
})
