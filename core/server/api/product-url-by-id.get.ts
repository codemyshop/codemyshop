/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/product-url-by-id?id=2381
 *
 * Reverse lookup id_product → URL canonique `/{pilier}/{category_path}/{link_rewrite}`.
 * Used by the legacy /product/[id] route that 301s to the SEO URL.
 *
 * Source ps_category + id_category_default (PS natif). Retourne
 * { found: true, path, name } ou { found: false }.
 */

import { resolveIdLang } from '~/server/utils/lang'
import { buildCategoryPathMap, buildProductUrlFromCategory } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'

export default defineEventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id || isNaN(id)) return { found: false }

  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    const rows = await db.query<{ link_rewrite: string; name: string; id_category_default: number }>(
      `SELECT pl.link_rewrite, pl.name, p.id_category_default
         FROM ps_product p
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
        WHERE p.id_product = ? AND p.active = 1
        LIMIT 1`,
      [idLang, id],
    )

    if (!rows.length) return { found: false }

    const r = rows[0]
    const piliers = await resolveTenantPiliers(event, db, idLang)
    const pathMap = await buildCategoryPathMap(db, [r.id_category_default], idLang, piliers)
    const prefixesByPilier: Record<string, string> = {}
    for (const p of piliers) prefixesByPilier[p.slug] = p.slug
    const url = buildProductUrlFromCategory(
      r.id_category_default,
      r.link_rewrite,
      pathMap,
      { prefixesByPilier, langPrefix: '', productId: id },
    )
    return { found: true, path: url, name: r.name }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { found: false }
    throw err
  }
})
