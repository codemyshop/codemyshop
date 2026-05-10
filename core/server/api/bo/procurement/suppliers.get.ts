/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/procurement/suppliers — liste fournisseurs (ps_supplier + adresse contact).
 * Query: ?search=xxx (LIKE on name, city, phone) — optional.
 * Joins ps_address (alias='supplier' or id_supplier=...) for contact.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const search = (q.search || '').trim()
  const db = useClientDb(event)

  const where: string[] = []
  const params: any[] = []
  if (search) {
    where.push('(s.name LIKE ? OR a.city LIKE ? OR a.phone LIKE ?)')
    const like = `%${search}%`
    params.push(like, like, like)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const suppliers = await db.query<any>(`
      SELECT
        s.id_supplier                                     AS id,
        s.name,
        s.active,
        s.date_add                                        AS dateAdd,
        a.phone, a.phone_mobile                           AS phoneMobile,
        a.address1, a.postcode, a.city,
        (SELECT COUNT(DISTINCT id_product) FROM ps_product_supplier ps WHERE ps.id_supplier = s.id_supplier) AS productCount,
        (SELECT COUNT(*) FROM ps_supply_order po WHERE po.id_supplier = s.id_supplier AND po.is_template = 0) AS orderCount
      FROM ps_supplier s
      LEFT JOIN ps_address a
        ON a.id_supplier = s.id_supplier AND a.deleted = 0
      ${whereSql}
      GROUP BY s.id_supplier, s.name, s.active, s.date_add,
               a.phone, a.phone_mobile, a.address1, a.postcode, a.city
      ORDER BY s.active DESC, s.name ASC
    `, params)
    return {
      total:       suppliers.length,
      activeCount: suppliers.filter((s: any) => Number(s.active) === 1).length,
      suppliers:   suppliers.map((s: any) => ({
        id: s.id, name: s.name,
        active: Number(s.active) === 1,
        productCount: Number(s.productCount || 0),
        orderCount: Number(s.orderCount || 0),
        dateAdd: s.dateAdd,
        phone: s.phone || '',
        phoneMobile: s.phoneMobile || '',
        address1: s.address1 || '',
        postcode: s.postcode || '',
        city: s.city || '',
      })),
    }
  } catch (err: any) {
    console.error('[bo/procurement/suppliers GET] DB error:', err?.message)
    return { total: 0, activeCount: 0, suppliers: [] }
  }
})
