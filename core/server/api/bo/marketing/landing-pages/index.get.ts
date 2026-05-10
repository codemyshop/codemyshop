/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * GET /api/bo/marketing/landing-pages — liste landing pages CMS
 * (Sprint 18.1 — ex /api/bo/marketing/pages, split landing vs blog).
 *
 * Isolation constraint: WHERE id_cms_category = 1. Only the
 * pages attached to the root category (institutional, pages
 * legal) are surfaced here. Blog articles live under
 * /api/bo/marketing/blog with the inverse constraint.
 *
 * Security: root/founder/market roles OR SaaS SuperAdmin.
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

  // Sprint 18.1 — isolation landing pages : UNIQUEMENT catégorie 1.
  const conditions: string[] = ['c.id_cms_category = 1']
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

    // Sprint 18.2 — ps_cms PS ancien n'a PAS date_add/date_upd
    // (tenants Example Shop prod et v2). On retire la colonne dateUpd du
    // SELECT pour garder l'endpoint compatible sur tous les tenants.
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
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = ? AND ccl.id_shop = 1
      ${where}
      ORDER BY c.id_cms DESC
      LIMIT ? OFFSET ?
    `, [langId, langId, ...params, perPage, offset])

    return { pages, total, page, perPage, totalPages: Math.ceil(total / perPage), langId }
  } catch (err: any) {
    console.error('[bo/marketing/landing-pages] DB error:', err?.message)
    return { pages: [], total: 0, page, perPage, totalPages: 0, langId }
  }
})
