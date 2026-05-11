

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)

  const db = useClientDb(event)

  if (q.length < 2) {
    
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
