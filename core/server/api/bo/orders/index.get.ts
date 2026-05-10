/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

/**
 * GET /api/bo/orders — paginated, sortable, filterable orders list (PG).
 * Query: ?page=1&perPage=30&search=…&status=2&sort=id|customer|total|date&dir=ASC|DESC
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const statusFilter = q.status ? Number(q.status) : 0
  const sort = q.sort || 'id'
  const dir = q.dir === 'ASC' ? sql.raw('ASC') : sql.raw('DESC')
  const d = usePocPg()

  try {
    const conditions: any[] = []

    if (search) {
      const s = `%${search}%`
      conditions.push(sql`(o.reference ILIKE ${s} OR c.firstname ILIKE ${s} OR c.lastname ILIKE ${s} OR c.email ILIKE ${s} OR c.company ILIKE ${s} OR (o.id_order::text) ILIKE ${s})`)
    }
    if (statusFilter) {
      conditions.push(sql`o.current_state = ${statusFilter}`)
    }

    const where = conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``

    const countRows: any[] = await d.execute(sql`
      SELECT COUNT(*) AS total
      FROM cs_main.ps_orders o
      LEFT JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      ${where}
    `) as any[]
    const total = Number(countRows?.[0]?.total ?? 0)
    const offset = (page - 1) * perPage

    const sortMap: Record<string, any> = {
      id: sql.raw('o.id_order'),
      customer: sql.raw('c.lastname'),
      total: sql.raw('o.total_paid_tax_incl'),
      date: sql.raw('o.date_add'),
    }
    const sortCol = sortMap[sort] || sortMap.id

    const orders: any[] = await d.execute(sql`
      SELECT
        o.id_order       AS "id",
        o.reference,
        o.id_customer    AS "customerId",
        CONCAT(c.firstname, ' ', c.lastname) AS "customerName",
        c.email          AS "customerEmail",
        c.company        AS "customerCompany",
        o.current_state  AS "statusId",
        COALESCE(osl.name, CONCAT('État #', o.current_state)) AS status,
        os.color         AS "statusColor",
        o.payment,
        ROUND(o.total_paid_tax_excl::numeric, 2)    AS "totalPaidHT",
        ROUND(o.total_paid_tax_incl::numeric, 2)    AS "totalPaidTTC",
        ROUND(o.total_shipping_tax_incl::numeric, 2) AS "totalShipping",
        o.date_add       AS "dateAdd",
        oi.id_order_invoice AS "invoiceId"
      FROM cs_main.ps_orders o
      LEFT JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_order_state os ON os.id_order_state = o.current_state
      LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
      LEFT JOIN cs_main.ps_order_invoice oi ON oi.id_order = o.id_order AND oi.number > 0
      ${where}
      ORDER BY ${sortCol} ${dir}
      LIMIT ${perPage} OFFSET ${offset}
    `) as any[]

    return { orders, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/orders] DB error:', err?.message)
    return { orders: [], total: 0, page, perPage, totalPages: 0 }
  }
})
