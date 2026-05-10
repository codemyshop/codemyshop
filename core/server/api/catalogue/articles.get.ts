/**
 *
 * GET /api/catalogue/articles?categoryId=132&limit=8
 *
 * Returns CMS articles (ps_cms) linked to a product category via the
 * table de jointure cs_category_cms (module ac_cmscategoryextra,
 * Sprint 11). Lecture DB directe via useClientDb.
 *
 * Why ps_cms and not ps_smart_blog: the tenant uses CMS pages
 * standard PrestaShop comme moteur de blog (35 entries au 08/04, slugs
 * in 3 segments like 'family--sub--slug'). The N-N pivot is
 * cs_category_cms (id_category, id_cms, position).
 *
 * Tenant-aware: limited to the current tenant for now. To extend to another
 * tenant, add its DB to CLIENT_DB_MAP + its base URL below.
 *
 * Cicatrices :
 * - useClientDb(event) → DB of the current tenant, NEVER the legacy database
 * - try/catch ER_NO_SUCH_TABLE on cs_category_cms → fallback
 * gracefully (table absent if module ac_cmscategoryextra is not installed)
 * - NO reference to cx.image (schema drift in cs_cms_extra between tenants
 *    Hub AC vs Example Shop — feedback_ps_ac_cms_extra_schema_drift)
 */
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
    // Comptage total (pour le carrousel "voir tout")
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

    // Articles avec dates de publication (LEFT JOIN sur cs_cms_extra
    // car certains articles peuvent ne pas avoir d'extra). Schéma minimal
    // commun à tous tenants : id_cms, date_published, date_updated.
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
      // link_rewrite Example Shop stocke les segments séparés par '--' (convention
      // legacy). Routing Nuxt utilise /blog/[category]/[subcategory]/[slug].vue
      // → reconstruire avec '/'. Slug 1-segment reste inchangé (split renvoie [slug]).
      url: `/blog/${r.link_rewrite.split('--').join('/')}`,
      date_published: r.date_published,
    }))

    return { articles, total, limit }
  } catch (err: any) {
    if (
      err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146 ||
      err?.code === 'ER_BAD_FIELD_ERROR' || err?.errno === 1054
    ) {
      // Module ac_cmscategoryextra pas installé OU drift schéma — fallback gracieux
      return { articles: [], total: 0, limit }
    }
    console.error('[articles] DB error:', err?.message)
    return { articles: [], total: 0, limit }
  }
})
