/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/cms/search?q=...&limit=20
 *
 * CMS article autocomplete (ps_cms) for the BlogPostLinker.
 * Tenant-aware via useClientDb(event) — on Example Shop reads from ps_example-shop.ps_cms.
 *
 * LIKE search on meta_title + link_rewrite (id_lang=1, id_shop=1).
 * Hard limit of 50 to avoid large payloads.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)

  const db = useClientDb(event)

  if (q.length < 2) {
    // Sans terme de recherche : on renvoie les articles les plus récents
    const rows = await db.query<any>(`
      SELECT c.id_cms AS id, c.active,
             cl.meta_title AS title, cl.link_rewrite AS slug,
             cx.date_published AS datePublished
        FROM ps_cms c
        LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = 1 AND cl.id_shop = 1
        LEFT JOIN cs_cms_extra cx ON cx.id_cms = c.id_cms
       WHERE c.active = 1
       ORDER BY cx.date_published DESC, c.id_cms DESC
       LIMIT ${limit}
    `)
    return { results: rows.map(mapRow), total: rows.length }
  }

  const like = `%${q}%`
  const rows = await db.query<any>(`
    SELECT c.id_cms AS id, c.active,
           cl.meta_title AS title, cl.link_rewrite AS slug,
           cx.date_published AS datePublished
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = 1 AND cl.id_shop = 1
      LEFT JOIN cs_cms_extra cx ON cx.id_cms = c.id_cms
     WHERE c.active = 1
       AND (cl.meta_title LIKE ? OR cl.link_rewrite LIKE ?)
     ORDER BY cx.date_published DESC, c.id_cms DESC
     LIMIT ${limit}
  `, [like, like])

  return { results: rows.map(mapRow), total: rows.length }
})

function mapRow(r: any) {
  return {
    id: Number(r.id),
    title: r.title || `#${r.id}`,
    slug: r.slug || '',
    datePublished: r.datePublished || null,
    active: !!r.active,
  }
}
