

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const filter = q.filter || ''
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const conditions: string[] = []
  const params: any[] = []

  if (search) {
    conditions.push(`(cr.code LIKE ? OR crl.name LIKE ? OR cr.description LIKE ?)`)
    const s = `%${search}%`
    params.push(s, s, s)
  }

  if (filter === 'active') {
    conditions.push(`cr.active = 1 AND cr.date_to >= NOW() AND cr.quantity > 0`)
  } else if (filter === 'expired') {
    conditions.push(`cr.date_to < NOW()`)
  } else if (filter === 'exhausted') {
    conditions.push(`cr.quantity = 0 AND cr.active = 1`)
  } else if (filter === 'inactive') {
    conditions.push(`cr.active = 0`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await db.get<any>(`
    SELECT COUNT(*) AS total FROM ps_cart_rule cr
    LEFT JOIN ps_cart_rule_lang crl ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = ?
    ${where}
  `, [langId, ...params])
  const total = countRow?.total ?? 0
  const offset = (page - 1) * perPage

  const rules = await db.query<any>(`
    SELECT
      cr.id_cart_rule AS id,
      cr.code,
      crl.name,
      cr.description,
      cr.active,
      cr.date_from AS dateFrom,
      cr.date_to AS dateTo,
      cr.quantity,
      cr.quantity_per_user AS quantityPerUser,
      cr.free_shipping AS freeShipping,
      cr.reduction_percent AS reductionPercent,
      cr.reduction_amount AS reductionAmount,
      cr.minimum_amount AS minimumAmount,
      cr.id_customer AS customerId,
      CASE
        WHEN cr.active = 0 THEN 'inactive'
        WHEN cr.date_to < NOW() THEN 'expired'
        WHEN cr.quantity = 0 THEN 'exhausted'
        ELSE 'active'
      END AS status
    FROM ps_cart_rule cr
    LEFT JOIN ps_cart_rule_lang crl ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = ?
    ${where}
    ORDER BY cr.date_add DESC
    LIMIT ? OFFSET ?
  `, [langId, ...params, perPage, offset])

  return { rules, total, page, perPage, totalPages: Math.ceil(total / perPage), langId }
})
