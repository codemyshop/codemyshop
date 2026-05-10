/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/specific-prices — lists the tenant's promotions for the PIM
 * (page /hub/products/promotions). DB-only direct query on ps_specific_price with
 * JOIN ps_product_lang for product name (id_lang=1).
 *
 * Query :
 * ?status=active|future|expired|all  (default: all)
 *   ?search=<texte produit ou ref>
 *   ?limit=50  ?offset=0
 *
 * MariaDB legacy sentinels:
 * - "from" = '1970-01-01 00:00:00' → considered "no start date" (always active)
 * - "to"   = '9999-12-31 23:59:59' → considered "no end date" (never expired)
 */
import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

const FROM_SENTINEL = '1970-01-01 00:00:00'
const TO_SENTINEL   = '9999-12-31 23:59:59'

interface Row {
  id_specific_price: number
  id_product: number
  id_product_attribute: number
  id_group: number
  id_customer: number
  product_name: string | null
  product_ref: string | null
  price: string
  reduction: string
  reduction_type: string
  reduction_tax: number
  from_quantity: number
  date_from: string | null
  date_to: string | null
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const status = (q.status || 'all').toLowerCase()
  const search = (q.search || '').trim()
  const limit  = Math.min(Math.max(Number(q.limit)  || 50, 1), 500)
  const offset = Math.max(Number(q.offset) || 0, 0)

  const db = useClientDb(event)

  const where: string[] = ['sp.reduction > 0']
  const params: any[] = []

  if (status === 'active') {
    where.push(`sp.\`from\` <= NOW()`)
    where.push(`sp.\`to\`   >= NOW()`)
  } else if (status === 'future') {
    where.push(`sp.\`from\` > NOW()`)
  } else if (status === 'expired') {
    where.push(`sp.\`to\` < NOW()`)
  }

  if (search) {
    where.push(`(pl.name LIKE ? OR p.reference LIKE ?)`)
    params.push(`%${search}%`, `%${search}%`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const totalRows = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total
         FROM ps_specific_price sp
    LEFT JOIN ps_product p ON p.id_product = sp.id_product
    LEFT JOIN ps_product_lang pl ON pl.id_product = sp.id_product AND pl.id_lang = 1
        ${whereSql}`,
      params,
    )
    const total = Number(totalRows[0]?.total ?? 0)

    const rows = await db.query<Row>(
      `SELECT sp.id_specific_price,
              sp.id_product,
              sp.id_product_attribute,
              sp.id_group,
              sp.id_customer,
              pl.name      AS product_name,
              p.reference  AS product_ref,
              sp.price,
              sp.reduction,
              sp.reduction_type,
              sp.reduction_tax,
              sp.from_quantity,
              sp.\`from\` AS date_from,
              sp.\`to\`   AS date_to
         FROM ps_specific_price sp
    LEFT JOIN ps_product p ON p.id_product = sp.id_product
    LEFT JOIN ps_product_lang pl ON pl.id_product = sp.id_product AND pl.id_lang = 1
        ${whereSql}
        ORDER BY sp.\`from\` DESC, sp.id_specific_price DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )

    const promotions = rows.map((r) => {
      const fromStr = String(r.date_from ?? '')
      const toStr   = String(r.date_to ?? '')
      const fromOpen = fromStr.startsWith('1970-01-01')
      const toOpen   = toStr.startsWith('9999-12-31')
      const now = new Date()
      const dateFrom = fromOpen ? null : fromStr
      const dateTo   = toOpen   ? null : toStr
      let computedStatus: 'active' | 'future' | 'expired' = 'active'
      if (!fromOpen && new Date(fromStr) > now) computedStatus = 'future'
      else if (!toOpen && new Date(toStr) < now) computedStatus = 'expired'
      return {
        id: Number(r.id_specific_price),
        idProduct: Number(r.id_product),
        idProductAttribute: Number(r.id_product_attribute),
        idGroup: Number(r.id_group),
        idCustomer: Number(r.id_customer),
        productName: r.product_name || null,
        productRef: r.product_ref || null,
        price: Number(r.price),
        reduction: Number(r.reduction),
        reductionType: r.reduction_type === 'amount' ? 'amount' : 'percentage',
        reductionTax: Number(r.reduction_tax),
        fromQuantity: Number(r.from_quantity || 1),
        dateFrom,
        dateTo,
        status: computedStatus,
      }
    })

    return { ok: true, total, limit, offset, promotions }
  } catch (err: any) {
    console.error('[bo/specific-prices/list] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'DB error' })
  }
})

export { FROM_SENTINEL, TO_SENTINEL }
