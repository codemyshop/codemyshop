

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) throw createError({ statusCode: 400, message: 'id invalide' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const d = usePocPg()

  const categoryResult: any = await d.execute(sql`
    SELECT
      c.id_category AS "id", c.id_parent AS "parentId", c.active,
      c.level_depth AS "depth", c.position, c.date_add AS "dateAdd", c.date_upd AS "dateUpd",
      cl.name, cl.description AS "summary", cl.additional_description AS "description", cl.link_rewrite AS "slug",
      cl.meta_title AS "metaTitle", cl.meta_description AS "metaDescription"
    FROM cs_main.ps_category c
    LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
    WHERE c.id_category = ${id}
  `)
  const category = ((categoryResult as any) as any[])[0]

  if (!category) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  
  
  
  
  
  
  try {
    const chainResult: any = await d.execute(sql`
      WITH RECURSIVE chain AS (
        SELECT c.id_category, c.id_parent, c.level_depth, cl.link_rewrite
        FROM cs_main.ps_category c
        LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
        WHERE c.id_category = ${id}
        UNION ALL
        SELECT c.id_category, c.id_parent, c.level_depth, cl.link_rewrite
        FROM chain ch
        JOIN cs_main.ps_category c ON c.id_category = ch.id_parent
        LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
        WHERE c.id_category > 1
      )
      SELECT level_depth, link_rewrite FROM chain
      WHERE level_depth >= 2 AND link_rewrite IS NOT NULL AND link_rewrite <> ''
      ORDER BY level_depth ASC
    `)
    const chain = ((chainResult as any) as any[]) ?? []
    const segments = chain.map((r: any) => String(r.link_rewrite || '')).filter(Boolean)
    
    
    category.frontPath = segments.length ? '/' + segments.join('/') + '/' : null
  } catch {
    category.frontPath = null
  }

  
  
  const { getCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
  category.h1 = (await getCategoryH1(id, langId, { event })) || ''

  
  
  
  
  try {
    const { getLatestDoneCoverForCategory } = await import('~/enterprise/ai/category-covergen/server/utils/category-covergen')
    const legacy = await getLatestDoneCoverForCategory(id, { event })
    category.legacyCoverUrl = legacy?.coverUrl || null
    category.legacyThumbUrl = legacy?.thumbUrl || null
  } catch {
    category.legacyCoverUrl = null
    category.legacyThumbUrl = null
  }

  const parentsResult: any = await d.execute(sql`
    SELECT c.id_category AS "id", cl.name, c.level_depth AS "depth", c.id_parent AS "parentId"
    FROM cs_main.ps_category c
    LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
    WHERE c.id_category != ${id} AND c.id_category > 1
    ORDER BY c.level_depth, c.position
  `)
  const parents = ((parentsResult as any) as any[]) ?? []

  
  const nbProductsResult: any = await d.execute(sql`
    SELECT COUNT(*) AS "n" FROM cs_main.ps_category_product WHERE id_category = ${id}
  `)
  const nbProducts = ((nbProductsResult as any) as any[])[0]

  const groupsResult: any = await d.execute(sql`
    SELECT g.id_group AS "id", gl.name
    FROM cs_main.ps_group g
    LEFT JOIN cs_main.ps_group_lang gl ON gl.id_group = g.id_group AND gl.id_lang = ${langId}
    ORDER BY g.id_group
  `)
  const groups = ((groupsResult as any) as any[]) ?? []

  const groupRowsResult: any = await d.execute(sql`
    SELECT id_group AS "id" FROM cs_main.ps_category_group WHERE id_category = ${id}
  `)
  const groupIds = (((groupRowsResult as any) as any[]) ?? []).map((r: any) => Number(r.id))

  
  
  
  
  let faqs: Array<{ id: number; position: number; active: boolean; question: string; answer: string }> = []
  let linkedPosts: Array<{ id: number; position: number; title: string; slug: string; datePublished: string | null; cover: string | null }> = []

  try {
    faqs = await listFaqsByParent('category', id, langId, { event }, { onlyActive: false })
  } catch (err: any) {
    
    if (
      err?.code !== '42P01' &&
      err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146
    ) throw err
  }

  try {
    
    
    
    
    const linkedResult: any = await d.execute(sql`
      SELECT a.id_cms AS "id", a.position,
             cl.meta_title AS "title", cl.link_rewrite AS "slug",
             cx.date_published AS "datePublished"
        FROM cs_main.cs_category_cms a
        JOIN cs_main.ps_cms c ON c.id_cms = a.id_cms
        LEFT JOIN cs_main.ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ${langId} AND cl.id_shop = 1
        LEFT JOIN cs_main.cs_cms_extra cx ON cx.id_cms = c.id_cms
       WHERE a.id_category = ${id}
       ORDER BY a.position ASC, a.id_cms ASC
    `)
    linkedPosts = (((linkedResult as any) as any[]) ?? []).map((r: any) => ({
      id: Number(r.id),
      position: Number(r.position) || 0,
      title: r.title || `#${r.id}`,
      slug: r.slug || '',
      datePublished: r.datePublished || null,
      cover: null,
    }))
  } catch (err: any) {
    
    
    if (
      err?.code !== '42P01' && err?.code !== '42703' &&
      err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146 &&
      err?.code !== 'ER_BAD_FIELD_ERROR' && err?.errno !== 1054
    ) throw err
  }

  return {
    category,
    parents,
    groups,
    groupIds,
    faqs,
    linkedPosts,
    nbProducts: nbProducts?.n ?? 0,
    langId,
  }
})
