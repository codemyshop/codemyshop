

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const status = (q.status || '').trim()
  const db = useClientDb(event)

  try {
    const conditions: string[] = []
    const params: any[] = []

    if (status && ['open', 'closed', 'pending1', 'pending2'].includes(status)) {
      conditions.push(`ct.status = ?`)
      params.push(status)
    }

    if (search) {
      conditions.push(`(
        ct.email ILIKE ?
        OR CONCAT(COALESCE(c.firstname,''), ' ', COALESCE(c.lastname,'')) ILIKE ?
        OR CAST(ct.id_order AS TEXT) = ?
        OR CAST(ct.id_customer_thread AS TEXT) = ?
      )`)
      const s = `%${search}%`
      params.push(s, s, search, search)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    
    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total
      FROM ps_customer_thread ct
      LEFT JOIN ps_customer c ON c.id_customer = ct.id_customer
      ${where}
    `, params)
    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    
    const statusRows = await db.query<any>(`
      SELECT status, COUNT(*) AS n FROM ps_customer_thread GROUP BY status
    `)
    const counts = { open: 0, closed: 0, pending1: 0, pending2: 0 }
    for (const r of statusRows) {
      if (r.status in counts) (counts as any)[r.status] = Number(r.n)
    }

    const threads = await db.query<any>(`
      SELECT
        ct.id_customer_thread AS id,
        ct.id_customer        AS customerId,
        ct.id_order           AS orderId,
        ct.id_contact         AS contactId,
        ct.email,
        ct.status,
        ct.date_add           AS dateAdd,
        ct.date_upd           AS dateUpd,
        COALESCE(NULLIF(TRIM(CONCAT(c.firstname, ' ', c.lastname)), ''), ct.email) AS customerName,
        o.reference           AS orderReference,
        COALESCE(mc.n, 0)     AS messagesCount
      FROM ps_customer_thread ct
      LEFT JOIN ps_customer c ON c.id_customer = ct.id_customer
      LEFT JOIN ps_orders o ON o.id_order = ct.id_order
      LEFT JOIN (
        SELECT id_customer_thread, COUNT(*) AS n
          FROM ps_customer_message
         GROUP BY id_customer_thread
      ) mc ON mc.id_customer_thread = ct.id_customer_thread
      ${where}
      ORDER BY ct.date_upd DESC
      LIMIT ? OFFSET ?
    `, [...params, perPage, offset])

    return {
      threads,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      counts,
    }
  } catch (err: any) {
    console.error('[bo/sav] DB error:', err?.message)
    return {
      threads: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
      counts: { open: 0, closed: 0, pending1: 0, pending2: 0 },
    }
  }
})
