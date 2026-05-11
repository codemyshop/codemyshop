

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  try {
    const [historyRows, refundRows, pendingOrders, pendingRefunds, ytd] = await Promise.all([
      db.query<any>(`
        SELECT
          YEARWEEK(date_add, 3)                                AS yw,
          DATE_FORMAT(MIN(date_add), '%Y-%m-%d')               AS startDate,
          ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)      AS inflow,
          COUNT(*)                                             AS orders
        FROM ps_orders
        WHERE valid = 1
          AND date_add >= DATE_SUB(CURDATE(), INTERVAL 13 WEEK)
        GROUP BY yw
        ORDER BY yw ASC
      `),
      db.query<any>(`
        SELECT
          YEARWEEK(date_add, 3)                                AS yw,
          ROUND(COALESCE(SUM(amount), 0), 2)                   AS outflow,
          COUNT(*)                                             AS slips
        FROM ps_order_slip
        WHERE date_add >= DATE_SUB(CURDATE(), INTERVAL 13 WEEK)
        GROUP BY yw
      `),
      db.get<any>(`
        SELECT
          COUNT(*)                                             AS count,
          ROUND(COALESCE(SUM(total_paid_tax_incl), 0), 2)      AS amount
        FROM ps_orders
        WHERE valid = 0
          AND date_add >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      `),
      db.get<any>(`
        SELECT
          COUNT(*)                                             AS count,
          ROUND(COALESCE(SUM(amount), 0), 2)                   AS amount
        FROM ps_order_slip
        WHERE date_add >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `),
      db.get<any>(`
        SELECT
          ROUND(COALESCE(SUM(o.total_paid_tax_incl), 0), 2)    AS inflow,
          (SELECT ROUND(COALESCE(SUM(amount), 0), 2)
             FROM ps_order_slip
             WHERE YEAR(date_add) = YEAR(NOW()))               AS outflow
        FROM ps_orders o
        WHERE o.valid = 1 AND YEAR(o.date_add) = YEAR(NOW())
      `),
    ])

    const refundByWeek: Record<string, { outflow: number; slips: number }> = {}
    for (const r of refundRows) refundByWeek[String(r.yw)] = { outflow: Number(r.outflow), slips: Number(r.slips) }

    const histMap: Record<string, { inflow: number; outflow: number; orders: number; startDate: string }> = {}
    for (const h of historyRows) {
      const yw = String(h.yw)
      histMap[yw] = {
        inflow: Number(h.inflow),
        outflow: refundByWeek[yw]?.outflow || 0,
        orders: Number(h.orders),
        startDate: h.startDate,
      }
    }

    
    const weeks: Array<{
      key: string
      label: string
      startDate: string
      isHistory: boolean
      inflow: number
      outflow: number
      net: number
      balance: number
      orders?: number
      isPending?: boolean
    }> = []

    const monday = (d: Date) => {
      const x = new Date(d)
      const day = (x.getUTCDay() + 6) % 7
      x.setUTCDate(x.getUTCDate() - day)
      x.setUTCHours(0, 0, 0, 0)
      return x
    }
    const isoYearWeek = (d: Date) => {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      const dayNum = (t.getUTCDay() + 6) % 7
      t.setUTCDate(t.getUTCDate() - dayNum + 3)
      const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
      const firstThuDayNum = (firstThursday.getUTCDay() + 6) % 7
      const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + firstThuDayNum) / 7)
      return `${t.getUTCFullYear()}${String(week).padStart(2, '0')}`
    }
    const fmtLabel = (d: Date) => `S${String(isoYearWeek(d).slice(4))} · ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`

    const today = monday(new Date())
    const histInflows: number[] = []
    const histOutflows: number[] = []

    for (let i = 12; i >= 0; i--) {
      const w = new Date(today); w.setUTCDate(w.getUTCDate() - i * 7)
      const yw = isoYearWeek(w)
      const m = histMap[yw]
      const inflow = m?.inflow || 0
      const outflow = m?.outflow || 0
      histInflows.push(inflow)
      histOutflows.push(outflow)
      weeks.push({
        key: yw,
        label: fmtLabel(w),
        startDate: w.toISOString().slice(0, 10),
        isHistory: true,
        inflow,
        outflow,
        net: inflow - outflow,
        balance: 0,
        orders: m?.orders || 0,
      })
    }

    const median = (arr: number[]) => {
      if (!arr.length) return 0
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }
    const projInflow = Math.round(median(histInflows))
    const projOutflow = Math.round(median(histOutflows))
    const pendingAmount = Number(pendingOrders?.amount || 0)

    
    for (let i = 1; i <= 13; i++) {
      const w = new Date(today); w.setUTCDate(w.getUTCDate() + i * 7)
      const inflow = projInflow + (i === 1 ? pendingAmount : 0)
      weeks.push({
        key: isoYearWeek(w),
        label: fmtLabel(w),
        startDate: w.toISOString().slice(0, 10),
        isHistory: false,
        inflow,
        outflow: projOutflow,
        net: inflow - projOutflow,
        balance: 0,
        isPending: i === 1 && pendingAmount > 0,
      })
    }

    
    const startBalance = Number(ytd?.inflow || 0) - Number(ytd?.outflow || 0)
    const histNetSum = weeks.slice(0, 13).reduce((s, w) => s + w.net, 0)
    let bal = startBalance - histNetSum
    for (const w of weeks) { bal += w.net; w.balance = Math.round(bal) }

    
    const alertThreshold = projOutflow * 4
    const alerts = weeks
      .filter(w => !w.isHistory && (w.balance < 0 || (alertThreshold > 0 && w.balance < alertThreshold)))
      .slice(0, 3)
      .map(w => ({
        week: w.key,
        label: w.label,
        balance: w.balance,
        severity: w.balance < 0 ? 'critical' : 'warning' as 'critical' | 'warning',
      }))

    return {
      currentBalance: Math.round(startBalance),
      ytdInflow: Number(ytd?.inflow || 0),
      ytdOutflow: Number(ytd?.outflow || 0),
      weeklyInflowMedian: projInflow,
      weeklyOutflowMedian: projOutflow,
      pendingOrders: { count: Number(pendingOrders?.count || 0), amount: pendingAmount },
      pendingRefunds: { count: Number(pendingRefunds?.count || 0), amount: Number(pendingRefunds?.amount || 0) },
      weeks,
      alerts,
    }
  } catch (err: any) {
    console.error('[bo/finance/treasury] DB error:', err?.message)
    return {
      currentBalance: 0,
      ytdInflow: 0,
      ytdOutflow: 0,
      weeklyInflowMedian: 0,
      weeklyOutflowMedian: 0,
      pendingOrders: { count: 0, amount: 0 },
      pendingRefunds: { count: 0, amount: 0 },
      weeks: [],
      alerts: [],
    }
  }
})
