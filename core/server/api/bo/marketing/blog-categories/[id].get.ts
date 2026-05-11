

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  
  const blogRoot = await db.get<any>(`
    SELECT c.id_cms_category AS id
    FROM ps_cms_category c
    JOIN ps_cms_category_lang cl ON cl.id_cms_category = c.id_cms_category AND cl.id_lang = 1
    WHERE cl.link_rewrite = 'blog' AND c.active = 1
    LIMIT 1
  `)
  const defaultParentId = blogRoot?.id || 1

  const parentsEligible = await db.query<any>(`
    SELECT
      c.id_cms_category AS id,
      c.id_parent       AS parentId,
      c.level_depth     AS levelDepth,
      COALESCE(cl.name, CONCAT('Catégorie #', c.id_cms_category)) AS name
    FROM ps_cms_category c
    LEFT JOIN ps_cms_category_lang cl
      ON cl.id_cms_category = c.id_cms_category
     AND cl.id_lang = ?
     AND cl.id_shop = 1
    WHERE c.active = 1
    ORDER BY c.level_depth ASC, c.position ASC
  `, [langId])

  if (id === 'new') {
    return {
      category: {
        id: 0,
        parentId: defaultParentId,
        levelDepth: 0,
        position: 0,
        active: 1,
        name: '',
        linkRewrite: '',
        description: '',
        metaTitle: '',
        metaDescription: '',
        articlesCount: 0,
        childrenCount: 0,
      },
      parentsEligible,
      isNew: true,
      langId,
    }
  }

  const idNum = Number(id)
  if (!idNum || idNum === 1) {
    throw createError({ statusCode: 404, message: 'Catégorie introuvable' })
  }

  const category = await db.get<any>(`
    SELECT
      c.id_cms_category   AS id,
      c.id_parent         AS parentId,
      c.level_depth       AS levelDepth,
      c.position,
      c.active,
      c.date_add          AS dateAdd,
      c.date_upd          AS dateUpd,
      COALESCE(cl.name, '')             AS name,
      COALESCE(cl.link_rewrite, '')     AS linkRewrite,
      COALESCE(cl.description, '')      AS description,
      COALESCE(cl.meta_title, '')       AS metaTitle,
      COALESCE(cl.meta_description, '') AS metaDescription,
      (SELECT COUNT(*) FROM ps_cms WHERE id_cms_category = c.id_cms_category) AS articlesCount,
      (SELECT COUNT(*) FROM ps_cms_category WHERE id_parent = c.id_cms_category) AS childrenCount
    FROM ps_cms_category c
    LEFT JOIN ps_cms_category_lang cl
      ON cl.id_cms_category = c.id_cms_category
     AND cl.id_lang = ?
     AND cl.id_shop = 1
    WHERE c.id_cms_category = ?
  `, [langId, idNum])

  if (!category) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  
  
  const descendantIds = await collectDescendants(db, idNum)
  const blocked = new Set<number>([idNum, ...descendantIds])
  const eligibleFiltered = parentsEligible.filter((p: any) => !blocked.has(Number(p.id)))

  return { category, parentsEligible: eligibleFiltered, isNew: false, langId }
})

async function collectDescendants(db: any, rootId: number): Promise<number[]> {
  const out: number[] = []
  const queue: number[] = [rootId]
  while (queue.length) {
    const current = queue.shift()!
    const children = await db.query<any>(
      `SELECT id_cms_category AS id FROM ps_cms_category WHERE id_parent = ?`,
      [current],
    )
    for (const c of children) {
      out.push(Number(c.id))
      queue.push(Number(c.id))
    }
  }
  return out
}
