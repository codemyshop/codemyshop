

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const sort = q.sort || 'id'
  const dir = q.dir === 'ASC' ? 'ASC' : 'DESC'
  const db = useClientDb(event)

  try {
    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      conditions.push(`(c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.company LIKE ?)`)
      const s = `%${search}%`
      params.push(s, s, s, s)
    }

    
    
    
    
    const having = 'HAVING COUNT(cp.id_product) > 0'
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total FROM (
        SELECT ca.id_cart, COUNT(cp.id_product) AS nbItems
        FROM ps_cart ca
        JOIN ps_cart_product cp ON cp.id_cart = ca.id_cart
        LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
        ${where}
        GROUP BY ca.id_cart
        ${having}
      ) sub
    `, params)

    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    const sortMap: Record<string, string> = { id: 'ca.id_cart', date: 'ca.date_add' }
    const orderClause = `ORDER BY ${sortMap[sort] || 'ca.id_cart'} ${dir}`

    
    
    
    
    const carts = await db.query<any>(`
      SELECT
        ca.id_cart       AS id,
        ca.id_customer   AS customerId,
        CASE WHEN ca.id_customer > 0 THEN CONCAT(c.firstname, ' ', c.lastname) ELSE 'Anonyme' END AS customerName,
        c.email          AS customerEmail,
        COUNT(cp.id_product) AS nbItems,
        COALESCE(SUM(cp.quantity), 0) AS totalProducts,
        ca.date_add      AS dateAdd,
        ca.date_upd      AS dateUpd,
        (SELECT COUNT(*) FROM ps_orders o WHERE o.id_cart = ca.id_cart) AS hasOrder,
        (SELECT COUNT(*) FROM cs_cart_recovery r WHERE r.id_cart = ca.id_cart) AS recoveriesCount
      FROM ps_cart ca
      JOIN ps_cart_product cp ON cp.id_cart = ca.id_cart
      LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
      ${where}
      GROUP BY ca.id_cart, c.id_customer, c.firstname, c.lastname, c.email
      ${having}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, perPage, offset])

    return { carts, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/carts] DB error:', err?.message)
    return { carts: [], total: 0, page, perPage, totalPages: 0 }
  }
})
