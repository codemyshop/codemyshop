/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { buildNuxtUrl, stripHtml } from '~/server/utils/ps'
import {
  getAuthorBySlugWithEmployee,
  listArticlesByAuthor,
} from '~/internal/employeeextra/server/utils/employeeextra'

/**
 * GET /api/public/author/:slug
 *
 * Public author page (E-E-A-T) — resolves slug → cs_employee_extra,
 * JOIN ps_employee for canonical names, and lists all articles
 * active whose author_employee_id points to this employee.
 *
 * 404 if:
 * - module ac_employeeextra not installed on the tenant (table missing)
 *   - slug inconnu
 *   - extras inactifs (active = 0)
 */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '').trim().toLowerCase()
  if (!slug) throw createError({ statusCode: 400, message: 'slug requis' })

  let author: any = null
  try {
    author = await getAuthorBySlugWithEmployee(slug, { event })
  } catch {
    throw createError({ statusCode: 404, message: 'Module page auteur non installé sur ce site' })
  }

  if (!author) throw createError({ statusCode: 404, message: 'Auteur introuvable' })

  // Articles : besoin de cs_cms_extra (author_employee_id). Si la
  // table n'existe pas, on renvoie l'auteur sans articles.
  let articles: any[] = []
  try {
    const rows = await listArticlesByAuthor(author.id, { event })

    articles = rows.map((r: any) => {
      const linkRewrite = r.link_rewrite || ''
      const rawContent = r.content || ''
      const metaDesc = r.meta_description || ''
      const parts = linkRewrite.split('--')
      const slug = parts.length >= 3 ? parts.slice(2).join('--') : linkRewrite
      const subcategory = parts.length >= 3 ? parts[1] : ''
      const category = r.pillar_slug || (parts.length >= 1 ? parts[0] : '')
      const cover = extractCover(rawContent)
      const plain = stripHtml(rawContent)

      return {
        id: r.id_cms,
        title: r.meta_title || '',
        excerpt: metaDesc || plain.slice(0, 160),
        coverImage: cover,
        thumbnailImage: deriveThumb(cover),
        category,
        subcategory,
        slug,
        linkRewrite,
        nuxtUrl: buildNuxtUrl(linkRewrite),
        datePublished: r.date_published || '',
        readingTime: Math.max(1, Math.round(plain.split(/\s+/).filter(Boolean).length / 200)),
      }
    })
  } catch {
    // cs_cms_extra absent — pas d'articles liables, on continue.
  }

  return { author, articles, count: articles.length }
})

function extractCover(html: string): string {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return m ? m[1] : ''
}

function deriveThumb(cover: string): string {
  if (!cover) return ''
  const f = cover.split('/').pop() ?? ''
  if (!f.startsWith('cover-')) return cover
  return cover.replace(/\/cover-/, '/thumb-')
}
