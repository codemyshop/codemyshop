

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  if (id === 'new') {
    return {
      feature: { id: 0, position: 0, name: '', valuesCount: 0, productsCount: 0 },
      values: [],
      isNew: true,
      langId,
    }
  }

  const idNum = Number(id)
  if (!idNum) throw createError({ statusCode: 404, message: 'Caractéristique introuvable' })

  const feature = await db.get<any>(`
    SELECT
      f.id_feature  AS id,
      f.position,
      COALESCE(fl.name, '') AS name,
      (SELECT COUNT(*) FROM ps_feature_value fv WHERE fv.id_feature = f.id_feature AND fv.custom = 0) AS valuesCount,
      (SELECT COUNT(DISTINCT fp.id_product)
         FROM ps_feature_product fp
         JOIN ps_feature_value fv ON fv.id_feature_value = fp.id_feature_value
         WHERE fv.id_feature = f.id_feature) AS productsCount
    FROM ps_feature f
    LEFT JOIN ps_feature_lang fl ON fl.id_feature = f.id_feature AND fl.id_lang = ?
    WHERE f.id_feature = ?
  `, [langId, idNum])

  if (!feature) throw createError({ statusCode: 404, message: 'Caractéristique introuvable' })

  const values = await db.query<any>(`
    SELECT
      fv.id_feature_value AS id,
      fv.custom,
      COALESCE(fvl.value, '') AS value
    FROM ps_feature_value fv
    LEFT JOIN ps_feature_value_lang fvl ON fvl.id_feature_value = fv.id_feature_value AND fvl.id_lang = ?
    WHERE fv.id_feature = ? AND fv.custom = 0
    ORDER BY fv.id_feature_value ASC
  `, [langId, idNum])

  return { feature, values, isNew: false, langId }
})
