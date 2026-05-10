/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/support/tickets — support tickets (`ps_customer_thread` with status + SLA). */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const [tickets, byStatus, byContact] = await Promise.all([
      db.query<any>(`
        SELECT
          ct.id_customer_thread                           AS id,
          ct.status,
          ct.email,
          ct.id_customer                                  AS customerId,
          CONCAT(c.firstname, ' ', c.lastname)            AS customerName,
          cl.name                                         AS contactName,
          ct.id_order                                     AS orderId,
          o.reference                                     AS orderRef,
          ct.date_add                                     AS dateAdd,
          ct.date_upd                                     AS dateUpd,
          TIMESTAMPDIFF(HOUR, ct.date_add, NOW())         AS ageHours,
          (SELECT COUNT(*) FROM ps_customer_message m
            WHERE m.id_customer_thread = ct.id_customer_thread) AS msgCount
        FROM ps_customer_thread ct
        LEFT JOIN ps_customer     c  ON c.id_customer = ct.id_customer
        LEFT JOIN ps_orders       o  ON o.id_order = ct.id_order
        LEFT JOIN ps_contact_lang cl ON cl.id_contact = ct.id_contact AND cl.id_lang = ct.id_lang
        ORDER BY
          CASE ct.status WHEN 'open' THEN 0 WHEN 'pending1' THEN 1 WHEN 'pending2' THEN 2 ELSE 3 END,
          ct.date_upd DESC
        LIMIT 100
      `),
      db.query<any>(`
        SELECT status, COUNT(*) AS count
        FROM ps_customer_thread
        GROUP BY status
      `),
      db.query<any>(`
        SELECT cl.name AS contactName, COUNT(*) AS count
        FROM ps_customer_thread ct
        LEFT JOIN ps_contact_lang cl ON cl.id_contact = ct.id_contact AND cl.id_lang = ct.id_lang
        GROUP BY ct.id_contact, cl.name
        ORDER BY count DESC
        LIMIT 6
      `),
    ])
    const statusMap = Object.fromEntries(byStatus.map((s: any) => [s.status, Number(s.count)]))
    return {
      stats: {
        total:    tickets.length,
        open:     statusMap.open || 0,
        closed:   statusMap.closed || 0,
        pending1: statusMap.pending1 || 0,
        pending2: statusMap.pending2 || 0,
      },
      byContact: byContact.map((c: any) => ({
        contactName: c.contactName || 'Contact inconnu',
        count: Number(c.count),
      })),
      tickets: tickets.map((t: any) => ({
        id: t.id,
        status: t.status,
        email: t.email,
        customerId: t.customerId,
        customerName: (t.customerName || '').trim() || null,
        contactName: t.contactName,
        orderId: t.orderId,
        orderRef: t.orderRef,
        dateAdd: t.dateAdd,
        dateUpd: t.dateUpd,
        ageHours: Number(t.ageHours || 0),
        msgCount: Number(t.msgCount || 0),
      })),
    }
  } catch (err: any) {
    console.error('[bo/support/tickets] DB error:', err?.message)
    return { stats: { total: 0, open: 0, closed: 0, pending1: 0, pending2: 0 }, byContact: [], tickets: [] }
  }
})
