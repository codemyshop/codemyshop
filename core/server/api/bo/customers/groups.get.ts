

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const groups = await db.query<any>(`
    SELECT
      g.id_group AS id,
      gl.name,
      g.reduction,
      g.price_display_method AS priceDisplayMethod,
      g.show_prices AS showPrices
    FROM ps_group g
    LEFT JOIN ps_group_lang gl ON gl.id_group = g.id_group AND gl.id_lang = ?
    ORDER BY g.id_group ASC
  `, [langId])

  return { groups, langId }
})
