/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/products/search-boost/aliases — list of ps_alias synonyms. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const search = (q.search || '').trim()
  const db = useClientDb(event)

  try {
    const params: any[] = []
    let where = ''
    if (search) {
      where = `WHERE alias LIKE ? OR search LIKE ?`
      const s = `%${search}%`
      params.push(s, s)
    }
    const [aliases, stats] = await Promise.all([
      db.query<any>(`
        SELECT id_alias AS id, alias, search, active
        FROM ps_alias
        ${where}
        ORDER BY active DESC, alias ASC
        LIMIT 500
      `, params),
      db.get<any>(`
        SELECT
          COUNT(*)                                  AS total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS activeCount
        FROM ps_alias
      `),
    ])
    return {
      total:       Number(stats?.total || 0),
      activeCount: Number(stats?.activeCount || 0),
      aliases: aliases.map((a: any) => ({
        id:     Number(a.id),
        alias:  a.alias,
        search: a.search,
        active: Number(a.active) === 1,
      })),
    }
  } catch (err: any) {
    console.error('[bo/products/search-boost/aliases GET] DB error:', err?.message)
    return { total: 0, activeCount: 0, aliases: [] }
  }
})
