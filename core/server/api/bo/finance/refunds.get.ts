

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const [slips, totals] = await Promise.all([
      db.query<any>(`
        SELECT
          s.id_order_slip                                   AS id,
          s.id_order                                        AS orderId,
          o.reference                                       AS orderRef,
          CONCAT(c.firstname, ' ', c.lastname)              AS customerName,
          c.email                                           AS customerEmail,
          ROUND(s.amount, 2)                                AS amount,
          ROUND(s.shipping_cost_amount, 2)                  AS shippingAmount,
          ROUND(s.total_products_tax_incl, 2)               AS productsAmount,
          s.partial                                         AS partial,
          s.order_slip_type                                 AS type,
          s.date_add                                        AS dateAdd
        FROM ps_order_slip s
        LEFT JOIN ps_orders   o ON o.id_order = s.id_order
        LEFT JOIN ps_customer c ON c.id_customer = s.id_customer
        ORDER BY s.date_add DESC
        LIMIT 100
      `),
      db.get<any>(`
        SELECT
          COUNT(*)                                          AS count,
          ROUND(COALESCE(SUM(amount), 0), 2)                AS totalAmount,
          ROUND(COALESCE(SUM(CASE WHEN date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0), 2) AS last30
        FROM ps_order_slip
      `),
    ])
    return {
      totalCount:   Number(totals?.count || 0),
      totalAmount:  Number(totals?.totalAmount || 0),
      last30Amount: Number(totals?.last30 || 0),
      slips: slips.map(s => ({
        id: s.id, orderId: s.orderId, orderRef: s.orderRef,
        customerName: s.customerName, customerEmail: s.customerEmail,
        amount: Number(s.amount), shippingAmount: Number(s.shippingAmount), productsAmount: Number(s.productsAmount),
        partial: !!s.partial,
        type: s.type === 1 ? 'Avoir' : 'Remboursement',
        dateAdd: s.dateAdd,
      })),
    }
  } catch (err: any) {
    console.error('[bo/finance/refunds] DB error:', err?.message)
    return { totalCount: 0, totalAmount: 0, last30Amount: 0, slips: [] }
  }
})
