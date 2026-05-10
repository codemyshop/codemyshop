/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { resolveClientId } from '~/server/utils/db'
import { listLatestStatusByCategoryIds } from '~/enterprise/ai/category-queue/server/utils/category-queue'

/**
 * GET /api/bo/categories — paginated categories via direct database.
 * Query: ?page=1&perPage=30&search=…
 *
 * Enriched with thumbUrl (cover) and redactionStatus from optional queues.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const d = usePocPg()

  try {
    // id_category > 2 : exclut Root (1) ET Accueil (2). Accueil est la racine
    // technique du shop PrestaShop (parent implicite de toutes les cats
    // top-level) — elle ne doit pas apparaître comme éditable dans le BO.
    // PG : ILIKE (case-insensitive) ≈ MySQL LIKE (collation ci par défaut).
    const searchClause = search ? sql`AND cl.name ILIKE ${'%' + search + '%'}` : sql``
    const where = sql`WHERE c.id_category > 2 ${searchClause}`

    const countResult: any = await d.execute(sql`
      SELECT COUNT(*) AS "total" FROM cs_main.ps_category c
      LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      ${where}
    `)
    const total = Number(((countResult as any) as any[])[0]?.total ?? 0)
    const offset = (page - 1) * perPage

    // Ordre arborescent via recursive CTE sur (id_parent, position).
    // PG : LPAD/CONCAT existent ; on assemble en TEXT (≠ MySQL CAST AS CHAR(500)).
    const categoriesResult: any = await d.execute(sql`
      WITH RECURSIVE cat_tree AS (
        SELECT c.id_category,
               (LPAD(c.position::text, 6, '0') || '-' || LPAD(c.id_category::text, 6, '0'))::text AS tree_order
        FROM cs_main.ps_category c
        WHERE c.id_parent = 2 AND c.id_category > 2
        UNION ALL
        SELECT c.id_category,
               (t.tree_order || '/' || LPAD(c.position::text, 6, '0') || '-' || LPAD(c.id_category::text, 6, '0'))::text
        FROM cs_main.ps_category c
        JOIN cat_tree t ON c.id_parent = t.id_category
      )
      SELECT
        c.id_category AS "id", cl.name, c.id_parent AS "parentId", c.active,
        c.level_depth AS "depth", c.position,
        EXTRACT(EPOCH FROM c.date_upd)::bigint AS "dateUpdTs",
        (SELECT COUNT(*) FROM cs_main.ps_category_product cp WHERE cp.id_category = c.id_category) AS "nbProducts",
        cl.description, cl.link_rewrite AS "slug"
      FROM cs_main.ps_category c
      LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      JOIN cat_tree t ON t.id_category = c.id_category
      ${where}
      ORDER BY t.tree_order
      LIMIT ${perPage} OFFSET ${offset}
    `)
    const categories = ((categoriesResult as any) as any[]) ?? []

    // --- Enrichissement optionnel : thumbUrl/coverUrl ---
    // Priorité PS natif : /img/c/{id}.jpg existe si ac_covergen l'a poussé
    // (mirror silo→PS). On fait un HEAD via fs-check côté tenant impossible
    // depuis Nuxt — à la place on retourne toujours le chemin PS canonique,
    // le <img @error> côté front bascule sur placeholder si 404.
    // Fallback : cs_category_covergen_queue legacy via façade ac_categorycovergen.
    let legacyMap = new Map<number, { thumbUrl: string | null; coverUrl: string | null }>()
    try {
      const { listLatestDoneCovers } = await import('~/enterprise/ai/category-covergen/server/utils/category-covergen')
      const coverRows = await listLatestDoneCovers({ event })
      legacyMap = new Map(coverRows.map((r) => [r.id_category, { thumbUrl: r.thumbUrl, coverUrl: r.coverUrl }]))
    } catch {
      // Table may not exist yet — on reste sur le fallback PS
    }
    // Slug SEO (id_lang=1 master) pour forger le filename WebP — même
    // convention que upload-cover.post.ts. On a déjà cat.slug en lang courante,
    // mais le filename sur disque suit id_lang=1 master, donc on le récupère
    // en bulk en une seule query.
    const idsForSlug = categories.map((c: any) => Number(c.id)).filter(Boolean)
    const masterSlugs = new Map<number, string>()
    if (idsForSlug.length) {
      const ids = sql.join(idsForSlug.map((id) => sql`${id}`), sql`, `)
      const slugResult: any = await d.execute(sql`
        SELECT id_category, link_rewrite FROM cs_main.ps_category_lang
         WHERE id_lang = 1 AND id_shop = 1 AND id_category IN (${ids})
      `)
      const slugRows = ((slugResult as any) as any[]) ?? []
      for (const r of slugRows) masterSlugs.set(Number(r.id_category), String(r.link_rewrite || ''))
    }
    function slugifyForFilename(s: string): string {
      return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'category'
    }
    for (const cat of categories) {
      const legacy = legacyMap.get(cat.id)
      // Cache bust via date_upd (changé par upload-cover). Force le browser à
      // recharger après un remplacement, même si l'URL sémantique est stable.
      const bust = cat.dateUpdTs ? `?v=${cat.dateUpdTs}` : ''
      const masterSlug = slugifyForFilename(masterSlugs.get(cat.id) || cat.slug || '')
      const webpThumb = `/img/c/${cat.id}-${masterSlug}-400.webp${bust}`
      const webpCover = `/img/c/${cat.id}-${masterSlug}-800.webp${bust}`
      const jpgFallback = `/img/c/${cat.id}.jpg${bust}`
      // thumbUrl prioritaire WebP PS natif (/img/c/{id}-{slug}-XXX.webp produit
      // par upload-cover ou migrate-webp). La queue covergen legacy
      // (cq.thumb_url pointant /blog-covers/) sert de fallback ultime pour
      // les catégories jamais migrées vers le chemin PS canonique. Le @error
      // côté front bascule sur jpgFallback puis placeholder si 404.
      ;(cat as any).thumbUrl = webpThumb || legacy?.thumbUrl
      ;(cat as any).coverUrl = webpCover || legacy?.coverUrl
      ;(cat as any).jpgFallback = jpgFallback
      ;(cat as any).legacyThumbUrl = legacy?.thumbUrl || null
      ;(cat as any).legacyCoverUrl = legacy?.coverUrl || null
    }

    // --- Enrichissement optionnel : redactionStatus via façade ac_categoryqueue ---
    try {
      if (categories.length) {
        const tenant = resolveClientId(event) || 'ac-hub'
        const ids = categories.map((c) => c.id)
        const redacRows = await listLatestStatusByCategoryIds(tenant, ids, { event })
        const redacMap = new Map(redacRows.map((r) => [r.id_category, r.status]))
        for (const cat of categories) {
          ;(cat as any).redactionStatus = redacMap.get(cat.id) || null
        }
      }
    } catch {
      // Table may not exist yet — graceful degradation
      for (const cat of categories) {
        ;(cat as any).redactionStatus = null
      }
    }

    return { categories, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/categories] DB error:', err?.message)
    return { categories: [], total: 0, page, perPage, totalPages: 0 }
  }
})
