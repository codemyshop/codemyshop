

import { useClientDbById, useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const { slug, clientId } = getQuery(event)
  if (!slug) throw createError({ statusCode: 400, message: 'slug requis' })

  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    
    const cat = await db.get<{
      id_category: number
      id_parent: number
      name: string
      link_rewrite: string
      description: string | null
      meta_description: string | null
      level_depth: number
    }>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name,             clf.name, '')             AS name,
              COALESCE(cl.link_rewrite,     clf.link_rewrite, '')     AS link_rewrite,
              COALESCE(cl.description,      clf.description, '')      AS description,
              COALESCE(cl.meta_description, clf.meta_description, '') AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang  = ?
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1
        WHERE c.active = 1 AND c.id_category > 2
          AND (cl.link_rewrite = ? OR clf.link_rewrite = ?)
        LIMIT 1`,
      [idLang, String(slug), String(slug)],
    )

    if (!cat) return null
    return {
      id: cat.id_category,
      id_parent: cat.id_parent,
      name: cat.name,
      slug: cat.link_rewrite,
      link_rewrite: cat.link_rewrite,
      description: cat.description,
      meta_description: cat.meta_description,
      level_depth: cat.level_depth,
    }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return null
    console.error('[catalogue/category-by-slug] DB error:', err?.message)
    return null
  }
})
