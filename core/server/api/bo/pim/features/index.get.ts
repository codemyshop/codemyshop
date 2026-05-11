

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      f.id_feature                                          AS id,
      f.position,
      COALESCE(fl.name, CONCAT('Caractéristique #', f.id_feature)) AS name,
      (SELECT COUNT(*) FROM ps_feature_value fv WHERE fv.id_feature = f.id_feature AND fv.custom = 0) AS valuesCount,
      (SELECT COUNT(DISTINCT fp.id_product)
         FROM ps_feature_product fp
         JOIN ps_feature_value fv ON fv.id_feature_value = fp.id_feature_value
         WHERE fv.id_feature = f.id_feature)                AS productsCount
    FROM ps_feature f
    LEFT JOIN ps_feature_lang fl ON fl.id_feature = f.id_feature AND fl.id_lang = ?
    ORDER BY f.position ASC, f.id_feature ASC
  `, [langId])

  return { features: rows, langId, total: rows.length }
})
