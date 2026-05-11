

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
      variant: {
        id: 0, position: 0, isColorGroup: 0, groupType: 'select',
        name: '', publicName: '',
        attributesCount: 0, combinationsCount: 0,
      },
      attributes: [],
      isNew: true,
      langId,
    }
  }

  const idNum = Number(id)
  if (!idNum) throw createError({ statusCode: 404, message: 'Groupe introuvable' })

  const variant = await db.get<any>(`
    SELECT
      g.id_attribute_group AS id,
      g.is_color_group     AS isColorGroup,
      g.group_type         AS groupType,
      g.position,
      COALESCE(gl.name, '')        AS name,
      COALESCE(gl.public_name, '') AS publicName,
      (SELECT COUNT(*) FROM ps_attribute a WHERE a.id_attribute_group = g.id_attribute_group) AS attributesCount,
      (SELECT COUNT(DISTINCT pac.id_product_attribute)
         FROM ps_product_attribute_combination pac
         JOIN ps_attribute a2 ON a2.id_attribute = pac.id_attribute
         WHERE a2.id_attribute_group = g.id_attribute_group) AS combinationsCount
    FROM ps_attribute_group g
    LEFT JOIN ps_attribute_group_lang gl ON gl.id_attribute_group = g.id_attribute_group AND gl.id_lang = ?
    WHERE g.id_attribute_group = ?
  `, [langId, idNum])

  if (!variant) throw createError({ statusCode: 404, message: 'Groupe introuvable' })

  const attributes = await db.query<any>(`
    SELECT
      a.id_attribute AS id,
      a.color,
      a.position,
      COALESCE(al.name, '') AS name
    FROM ps_attribute a
    LEFT JOIN ps_attribute_lang al ON al.id_attribute = a.id_attribute AND al.id_lang = ?
    WHERE a.id_attribute_group = ?
    ORDER BY a.position ASC, a.id_attribute ASC
  `, [langId, idNum])

  return { variant, attributes, isNew: false, langId }
})
