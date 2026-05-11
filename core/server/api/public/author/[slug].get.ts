

import { buildNuxtUrl, stripHtml } from '~/server/utils/ps'
import {
  getAuthorBySlugWithEmployee,
  listArticlesByAuthor,
} from '~/internal/employeeextra/server/utils/employeeextra'

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
