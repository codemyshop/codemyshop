/**
 *
 * GET /api/catalogue/categories?clientId=example-vape-v2&limit=200&lang=fr
 *
 * List of active PS categories for a workspace. Refactored to direct DB (principle
 * 'Zero PrestaShop webservice' 2026-04-22). The previous implementation
 * went through getConnector(clientId).getCategories() which used psFetch.
 * Benefits: ~100-300ms latency saved, robustness against misconfigured Apache
 * configured (v2 AllowOverride validation), DB-only alignment.
 */
import { useClientDbById, useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

interface CategoryRow {
  id_category: number
  id_parent: number
  name: string
  description: string | null
  meta_description: string | null
  link_rewrite: string
  active: number
  level_depth: number
}

export default defineEventHandler(async (event) => {
  const { clientId, limit = '200' } = getQuery(event)
  const idLang = await resolveIdLang(event)
  const max = Math.min(Math.max(Number(limit) || 200, 1), 500)

  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    // id_category > 2 : exclut Root (1) et Home (2) natifs PS.
    // JOIN lang avec fallback id_lang=1 (FR source de vérité).
    const rows = await db.query<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.active, c.level_depth,
              COALESCE(cl.name,             clf.name, '')             AS name,
              COALESCE(cl.description,      clf.description, '')      AS description,
              COALESCE(cl.meta_description, clf.meta_description, '') AS meta_description,
              COALESCE(cl.link_rewrite,     clf.link_rewrite, '')     AS link_rewrite
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang  = ?
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1
        WHERE c.active = 1 AND c.id_category > 2
        ORDER BY cl.name
        LIMIT ?`,
      [idLang, max],
    )

    return rows.map((r) => ({
      id: r.id_category,
      id_parent: r.id_parent,
      name: r.name,
      slug: r.link_rewrite,
      link_rewrite: r.link_rewrite,
      description: r.description,
      meta_description: r.meta_description,
      level_depth: r.level_depth,
      productCount: null,
    }))
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return []
    console.error('[catalogue/categories] DB error:', err?.message)
    return []
  }
})
