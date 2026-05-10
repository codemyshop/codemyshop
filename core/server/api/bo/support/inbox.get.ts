/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/support/inbox — conversations SAV (ps_customer_thread + ps_customer_message). */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const [threads, stats] = await Promise.all([
      db.query<any>(`
        SELECT
          ct.id_customer_thread                           AS id,
          ct.status,
          ct.email,
          ct.id_customer                                  AS customerId,
          ct.id_order                                     AS orderId,
          CONCAT(c.firstname, ' ', c.lastname)            AS customerName,
          cl.name                                         AS contactName,
          o.reference                                     AS orderRef,
          ct.date_upd                                     AS dateUpd,
          (SELECT COUNT(*) FROM ps_customer_message m
            WHERE m.id_customer_thread = ct.id_customer_thread) AS msgCount,
          (SELECT m.message FROM ps_customer_message m
            WHERE m.id_customer_thread = ct.id_customer_thread
            ORDER BY m.date_add DESC LIMIT 1)             AS lastMessage,
          (SELECT m.date_add FROM ps_customer_message m
            WHERE m.id_customer_thread = ct.id_customer_thread
            ORDER BY m.date_add DESC LIMIT 1)             AS lastDate
        FROM ps_customer_thread ct
        LEFT JOIN ps_customer    c  ON c.id_customer = ct.id_customer
        LEFT JOIN ps_orders      o  ON o.id_order = ct.id_order
        LEFT JOIN ps_contact_lang cl ON cl.id_contact = ct.id_contact AND cl.id_lang = ct.id_lang
        ORDER BY ct.date_upd DESC
        LIMIT 80
      `),
      db.get<any>(`
        SELECT
          COUNT(*)                                           AS total,
          SUM(CASE WHEN status = 'open'    THEN 1 ELSE 0 END) AS openCount,
          SUM(CASE WHEN status = 'closed'  THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN status LIKE 'pending%' THEN 1 ELSE 0 END) AS pendingCount
        FROM ps_customer_thread
      `),
    ])
    return {
      stats: {
        total:   Number(stats?.total || 0),
        open:    Number(stats?.openCount || 0),
        closed:  Number(stats?.closedCount || 0),
        pending: Number(stats?.pendingCount || 0),
      },
      threads: threads.map((t: any) => ({
        id: t.id,
        status: t.status,
        email: t.email,
        customerId: t.customerId,
        customerName: (t.customerName || '').trim() || null,
        contactName: t.contactName,
        orderId: t.orderId,
        orderRef: t.orderRef,
        msgCount: Number(t.msgCount || 0),
        lastMessage: (t.lastMessage || '').slice(0, 180),
        lastDate: t.lastDate || t.dateUpd,
      })),
    }
  } catch (err: any) {
    console.error('[bo/support/inbox] DB error:', err?.message)
    return { stats: { total: 0, open: 0, closed: 0, pending: 0 }, threads: [] }
  }
})
