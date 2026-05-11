

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

interface ArticleRow {
  id_cms: number
  meta_title: string
  link_rewrite: string
  meta_description: string | null
  date_published: string | null
  date_updated: string | null
}

interface ArticleCard {
  id: number
  title: string
  slug: string
  excerpt: string
  url: string
  date_published: string | null
}

interface ArticlesResponse {
  articles: ArticleCard[]
  total: number
  limit: number
}

export default defineEventHandler(async (event): Promise<ArticlesResponse> => {
  const tenant = resolveClientId(event)
  if (!tenant) {
    return { articles: [], total: 0, limit: 0 }
  }

  const q = getQuery(event)
  const categoryId = Number(q.categoryId)
  const limit = Math.min(Math.max(Number(q.limit) || 8, 1), 24)

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { articles: [], total: 0, limit }
  }

  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    
    const totalRows = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total
         FROM cs_category_cms cc
         JOIN ps_cms c ON c.id_cms = cc.id_cms AND c.active = 1
        WHERE cc.id_category = ?`,
      [categoryId],
    )
    const total = Number(totalRows[0]?.total ?? 0)
    if (total === 0) {
      return { articles: [], total: 0, limit }
    }

    
    
    
    const rows = await db.query<ArticleRow>(
      `SELECT c.id_cms,
              cl.meta_title,
              cl.link_rewrite,
              cl.meta_description,
              cx.date_published,
              cx.date_updated
         FROM cs_category_cms cc
         JOIN ps_cms c ON c.id_cms = cc.id_cms AND c.active = 1
         JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
         LEFT JOIN cs_cms_extra cx ON cx.id_cms = c.id_cms
        WHERE cc.id_category = ?
        ORDER BY cc.position ASC, cx.date_published DESC, c.id_cms DESC
        LIMIT ?`,
      [idLang, categoryId, limit],
    )

    const base = useRuntimeConfig().public.psFrontUrl as string || ''
    const articles: ArticleCard[] = rows.map(r => ({
      id: Number(r.id_cms),
      title: r.meta_title,
      slug: r.link_rewrite,
      excerpt: r.meta_description ?? '',
      
      
      
      url: `/blog/${r.link_rewrite.split('--').join('/')}`,
      date_published: r.date_published,
    }))

    return { articles, total, limit }
  } catch (err: any) {
    if (
      err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146 ||
      err?.code === 'ER_BAD_FIELD_ERROR' || err?.errno === 1054
    ) {
      
      return { articles: [], total: 0, limit }
    }
    console.error('[articles] DB error:', err?.message)
    return { articles: [], total: 0, limit }
  }
})
