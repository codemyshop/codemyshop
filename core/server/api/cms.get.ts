

import { buildNuxtUrl, stripHtml } from '~/server/utils/ps'
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const { limit = '20', category = '' } = getQuery(event)

  try {
    const db = useClientDb(event)
    const idLang = await resolveIdLang(event)

    
    let hasExtraTable = false
    try {
      await db.query('SELECT 1 FROM cs_cms_extra LIMIT 0')
      hasExtraTable = true
    } catch {  }

    
    let hasCoverQueue = false
    try {
      await db.query('SELECT 1 FROM cs_covergen_queue LIMIT 0')
      hasCoverQueue = true
    } catch {  }

    const coverSelect = hasCoverQueue
      ? `, COALESCE((SELECT cq.cover_url FROM cs_covergen_queue cq WHERE cq.id_cms = c.id_cms AND cq.status = 'done' ORDER BY cq.id_covergen DESC LIMIT 1), '') as generated_cover`
      : `, '' as generated_cover`

    
    
    
    
    
    
    
    
    
    
    
    
    const eligibleWhere = `c.active = 1 AND (ccl.link_rewrite IS NOT NULL OR cl.link_rewrite LIKE '%--%--%')`

    let sql = hasExtraTable
      ? `SELECT c.id_cms, cl.meta_title, cl.meta_description, cl.content, cl.link_rewrite,
               COALESCE(ccl.link_rewrite, '') AS pillar_slug,
               ex.date_published, ex.date_updated
               ${coverSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         LEFT JOIN ps_cms_category pcat ON pcat.id_cms_category = c.id_cms_category AND pcat.id_parent != 1
         LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = pcat.id_cms_category AND ccl.id_lang = ?
         LEFT JOIN cs_cms_extra ex ON ex.id_cms = c.id_cms
         WHERE ${eligibleWhere}`
      : `SELECT c.id_cms, cl.meta_title, cl.meta_description, cl.content, cl.link_rewrite,
               COALESCE(ccl.link_rewrite, '') AS pillar_slug,
               NULL as date_published, NULL as date_updated
               ${coverSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         LEFT JOIN ps_cms_category pcat ON pcat.id_cms_category = c.id_cms_category AND pcat.id_parent != 1
         LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = pcat.id_cms_category AND ccl.id_lang = ?
         WHERE ${eligibleWhere}`
    const params: any[] = [idLang, idLang]

    if (category) {
      
      
      sql += ' AND (ccl.link_rewrite = ? OR cl.link_rewrite LIKE ?)'
      params.push(String(category), `${category}--%`)
    }

    sql += ' ORDER BY c.id_cms DESC'

    if (Number(limit) > 0) {
      sql += ' LIMIT ?'
      params.push(Number(limit))
    }

    const rows = await db.query(sql, params)

    return rows.map((r: any) => {
      const linkRewrite = r.link_rewrite || ''
      const rawContent = r.content || ''
      const metaDesc = r.meta_description || ''
      const parsed = parseSlug(linkRewrite)
      
      const category = r.pillar_slug || parsed.category
      const slug = parsed.slug
      const parts = linkRewrite.split('--')
      const subcategory = parts.length >= 3 ? parts[1] : ''

      const coverImage = extractCoverImage(rawContent) || r.generated_cover || ''
      const plainText = stripHtml(rawContent)
      const wordCount = plainText.split(/\s+/).filter(Boolean).length
      const faqCount = (rawContent.match(/<dt[\s>]/gi) || []).length

      return {
        id: r.id_cms,
        title: r.meta_title || '',
        category,
        subcategory,
        slug,
        linkRewrite,
        excerpt: metaDesc || plainText.slice(0, 160),
        coverImage,
        thumbnailImage: deriveThumbnail(coverImage),
        nuxtUrl: buildNuxtUrl(linkRewrite),
        datePublished: r.date_published || '',
        dateUpdated: r.date_updated || '',
        readingTime: Math.max(1, Math.round(wordCount / 200)),
        faqCount,
      }
    })
  } catch (err: any) {
    console.error('[API cms] DB error:', err.message)
    return []
  }
})

function extractCoverImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : ''
}

function deriveThumbnail(coverUrl: string): string {
  if (!coverUrl) return ''
  const filename = coverUrl.split('/').pop() ?? ''
  if (!filename.startsWith('cover-')) return coverUrl
  return coverUrl.replace(/\/cover-/, '/thumb-')
}

function parseSlug(linkRewrite: string) {
  const sep = linkRewrite.indexOf('--')
  if (sep === -1) return { category: '', slug: linkRewrite }
  return { category: linkRewrite.slice(0, sep), slug: linkRewrite.slice(sep + 2) }
}
