/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/blog/search?q=term
 * Search CMS articles by title, description, and content.
 * Lecture directe DB (ps_cms + ps_cms_lang).
 */
import { buildNuxtUrl, stripHtml } from '~/server/utils/ps'
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { q = '' } = getQuery(event)
  const query = String(q).trim().toLowerCase()

  if (query.length < 2) return []

  try {
    const db = useClientDb(event)

    const wildcard = `%${query}%`
    const rows = await db.query(
      `SELECT c.id_cms, cl.meta_title, cl.meta_description, cl.content, cl.link_rewrite
       FROM ps_cms c
       JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
       WHERE c.active = 1 AND cl.link_rewrite LIKE '%--%--%'
         AND (cl.meta_title LIKE ? OR cl.meta_description LIKE ? OR cl.content LIKE ?)
       ORDER BY c.id_cms DESC
       LIMIT 20`,
      [wildcard, wildcard, wildcard]
    )

    return rows.map((r: any) => {
      const linkRewrite = r.link_rewrite || ''
      const parts = linkRewrite.split('--')
      const category = parts[0] || ''
      const subcategory = parts.length >= 3 ? parts[1] : ''
      const slug = parts.length >= 3 ? parts.slice(2).join('--') : parts.slice(1).join('--')
      const plainText = stripHtml(r.content || '')

      return {
        id: r.id_cms,
        title: r.meta_title || '',
        slug,
        category,
        subcategory,
        excerpt: r.meta_description || plainText.slice(0, 160),
        nuxtUrl: buildNuxtUrl(linkRewrite),
        datePublished: '',
      }
    })
  } catch (err: any) {
    console.error('[API blog/search] DB error:', err.message)
    return []
  }
})
