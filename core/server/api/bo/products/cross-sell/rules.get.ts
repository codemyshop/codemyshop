

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const search = (q.search || '').trim()
  const src = q.src ? Number(q.src) : 0
  const db = useClientDb(event)

  try {
    const conditions: string[] = []
    const params: any[] = []
    if (src > 0) {
      conditions.push(`a.id_product_1 = ?`)
      params.push(src)
    }
    if (search) {
      conditions.push(`(p1.name LIKE ? OR p2.name LIKE ?)`)
      const s = `%${search}%`
      params.push(s, s)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rules = await db.query<any>(`
      SELECT
        a.id_product_1                     AS src,
        a.id_product_2                     AS dst,
        p1.name                            AS srcName,
        p2.name                            AS dstName,
        pr1.reference                      AS srcRef,
        pr2.reference                      AS dstRef
      FROM ps_accessory a
      LEFT JOIN ps_product_lang p1 ON p1.id_product = a.id_product_1 AND p1.id_lang = 1
      LEFT JOIN ps_product_lang p2 ON p2.id_product = a.id_product_2 AND p2.id_lang = 1
      LEFT JOIN ps_product     pr1 ON pr1.id_product = a.id_product_1
      LEFT JOIN ps_product     pr2 ON pr2.id_product = a.id_product_2
      ${where}
      ORDER BY a.id_product_1 ASC, a.id_product_2 ASC
      LIMIT 500
    `, params)

    return {
      total: rules.length,
      rules: rules.map(r => ({
        src:     Number(r.src),
        dst:     Number(r.dst),
        srcName: r.srcName || `Produit #${r.src}`,
        dstName: r.dstName || `Produit #${r.dst}`,
        srcRef:  r.srcRef || '',
        dstRef:  r.dstRef || '',
      })),
    }
  } catch (err: any) {
    console.error('[bo/products/cross-sell/rules] DB error:', err?.message)
    return { total: 0, rules: [] }
  }
})
