/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * GET /api/bo/marketing/blog — liste articles de blog (Sprint 18.1).
 *
 * Isolation constraint: WHERE id_cms_category <> 1. Only
 * pages attached to a blog category (everything except the institutional root)
 * are returned. Landing pages live under
 * /api/bo/marketing/landing-pages with the inverse constraint.
 *
 * Security: root/founder/market roles OR SaaS SuperAdmin.
 *
 * Note: this endpoint remains 100% raw SQL — it's a native PS view
 * (ps_cms + ps_cms_lang) that aggregates optional sub-queries
 * on cs_covergen_queue + cs_cms_queue. Refactoring into a facade
 * cross-domain not relevant (complex read-only view specific to
 * BO blog).
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const status = (q.status || '').trim()
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const conditions: string[] = ['c.id_cms_category <> 1']
  const params: any[] = []

  if (status === 'active') {
    conditions.push(`c.active = 1`)
  } else if (status === 'draft') {
    conditions.push(`c.active = 0`)
  }

  if (search) {
    conditions.push(`(
      cl.meta_title ILIKE ?
      OR cl.link_rewrite ILIKE ?
      OR ccl.name ILIKE ?
      OR CAST(c.id_cms AS TEXT) = ?
    )`)
    const s = `%${search}%`
    params.push(s, s, s, search)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = ? AND ccl.id_shop = 1
      ${where}
    `, [langId, langId, ...params])
    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    let coverSelect = ", '' AS thumbUrl"
    let redactionSelect = ", '' AS redactionStatus"
    try {
      await db.query('SELECT 1 FROM cs_covergen_queue LIMIT 0')
      coverSelect = `, COALESCE((SELECT cq.thumb_url FROM cs_covergen_queue cq WHERE cq.id_cms = c.id_cms AND cq.status = 'done' ORDER BY cq.id_covergen DESC LIMIT 1), '') AS thumbUrl`
    } catch { /* table doesn't exist */ }
    try {
      await db.query('SELECT 1 FROM cs_cms_queue LIMIT 0')
      redactionSelect = `, COALESCE((SELECT rq.status FROM cs_cms_queue rq WHERE rq.id_cms = c.id_cms ORDER BY rq.id_redaction DESC LIMIT 1), '') AS redactionStatus`
    } catch { /* table doesn't exist */ }

    const pages = await db.query<any>(`
      SELECT
        c.id_cms           AS id,
        c.id_cms_category  AS categoryId,
        c.active,
        c.indexation,
        c.position,
        cl.meta_title      AS title,
        cl.meta_description AS metaDescription,
        cl.link_rewrite    AS linkRewrite,
        COALESCE(ccl.name, '')       AS categoryName
        ${coverSelect}
        ${redactionSelect}
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = ? AND ccl.id_shop = 1
      ${where}
      ORDER BY c.id_cms DESC
      LIMIT ? OFFSET ?
    `, [langId, langId, ...params, perPage, offset])

    return { pages, total, page, perPage, totalPages: Math.ceil(total / perPage), langId }
  } catch (err: any) {
    console.error('[bo/marketing/blog] DB error:', err?.message)
    return { pages: [], total: 0, page, perPage, totalPages: 0, langId }
  }
})
