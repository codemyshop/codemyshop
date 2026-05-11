

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      c.id_cms_category   AS id,
      c.id_parent         AS parentId,
      c.level_depth       AS levelDepth,
      c.position,
      c.active,
      c.date_add          AS dateAdd,
      c.date_upd          AS dateUpd,
      COALESCE(cl.name, CONCAT('Catégorie #', c.id_cms_category)) AS name,
      COALESCE(cl.link_rewrite, '')   AS linkRewrite,
      COALESCE(cl.meta_title, '')     AS metaTitle,
      COALESCE(cl.meta_description, '') AS metaDescription,
      COALESCE(cl.description, '')    AS description,
      (SELECT COUNT(*) FROM ps_cms WHERE id_cms_category = c.id_cms_category) AS articlesCount,
      (SELECT COUNT(*) FROM ps_cms_category WHERE id_parent = c.id_cms_category) AS childrenCount
    FROM ps_cms_category c
    LEFT JOIN ps_cms_category_lang cl
      ON cl.id_cms_category = c.id_cms_category
     AND cl.id_lang = ?
     AND cl.id_shop = 1
    WHERE c.id_cms_category <> 1
    ORDER BY c.level_depth ASC, c.id_parent ASC, c.position ASC, c.id_cms_category ASC
  `, [langId])

  return { categories: rows, langId, total: rows.length }
})
