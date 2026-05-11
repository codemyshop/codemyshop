

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const [returns, byState] = await Promise.all([
      db.query<any>(`
        SELECT
          r.id_order_return                               AS id,
          r.id_order                                      AS orderId,
          o.reference                                     AS orderRef,
          CONCAT(c.firstname, ' ', c.lastname)            AS customerName,
          c.email                                         AS customerEmail,
          r.question,
          r.state                                         AS stateId,
          COALESCE(rsl.name, CONCAT('État #', r.state))   AS stateName,
          r.date_add                                      AS dateAdd,
          r.date_upd                                      AS dateUpd
        FROM ps_order_return r
        LEFT JOIN ps_orders   o   ON o.id_order = r.id_order
        LEFT JOIN ps_customer c   ON c.id_customer = r.id_customer
        LEFT JOIN ps_order_return_state_lang rsl
          ON rsl.id_order_return_state = r.state AND rsl.id_lang = 1
        ORDER BY r.date_add DESC
        LIMIT 100
      `),
      db.query<any>(`
        SELECT
          r.state                                         AS stateId,
          COALESCE(rsl.name, CONCAT('État #', r.state))   AS stateName,
          COUNT(*)                                        AS count
        FROM ps_order_return r
        LEFT JOIN ps_order_return_state_lang rsl
          ON rsl.id_order_return_state = r.state AND rsl.id_lang = 1
        GROUP BY r.state, rsl.name
        ORDER BY count DESC
      `),
    ])
    return {
      total: returns.length,
      byState: byState.map(s => ({ stateId: s.stateId, stateName: s.stateName, count: Number(s.count) })),
      returns: returns.map((r: any) => ({
        id: r.id, orderId: r.orderId, orderRef: r.orderRef,
        customerName: r.customerName, customerEmail: r.customerEmail,
        question: (r.question || '').slice(0, 200),
        stateId: r.stateId, stateName: r.stateName,
        dateAdd: r.dateAdd, dateUpd: r.dateUpd,
      })),
    }
  } catch (err: any) {
    console.error('[bo/support/rma] DB error:', err?.message)
    return { total: 0, byState: [], returns: [] }
  }
})
