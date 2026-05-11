

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 1) {
    throw createError({ statusCode: 400, message: 'id catégorie invalide' })
  }

  const db = useClientDb(event)
  const rows = await db.query<{
    id_cross_category: number
    position: number
    name: string | null
    link_rewrite: string | null
    level_depth: number
    active: number
    id_parent: number
  }>(
    `SELECT cc.id_cross_category, cc.position,
            cl.name, cl.link_rewrite,
            c.level_depth, c.active, c.id_parent
       FROM cs_category_cross cc
       JOIN ps_category c        ON c.id_category = cc.id_cross_category
  LEFT JOIN ps_category_lang cl  ON cl.id_category = cc.id_cross_category
                                AND cl.id_lang = 1 AND cl.id_shop = 1
      WHERE cc.id_category = ?
      ORDER BY cc.position ASC, cc.id_cross_category ASC`,
    [id],
  )

  return {
    items: rows.map((r) => ({
      id: r.id_cross_category,
      name: r.name || '',
      link_rewrite: r.link_rewrite || '',
      level_depth: r.level_depth,
      active: r.active === 1,
      id_parent: r.id_parent,
      position: r.position,
    })),
  }
})
