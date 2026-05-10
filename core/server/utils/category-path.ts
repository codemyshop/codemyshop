/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Shared helpers to build product URLs `/{pilier}/{path}/{slug}`
 * depuis ps_product.id_category_default.
 *
 * Tenant-aware (refacto chantier codemyshop-industrialisation 2026-05-08) :
 * pillars are resolved dynamically via `tenant-piliers.ts` from
 * `runtimeConfig.public.piliers: string[]`. No more hardcoded constants
 * Example Shop (PILIER_GROSSISTE/MARQUE) — all Example Shop config is declared via
 * `piliers: ['grossiste:2', 'marque']` in its nuxt.config.ts.
 *
 * Source: walk id_parent on ps_category until pillar (id resolved) or
 * until the Home root. Used by new-products, promotions,
 * best-sellers, by-category, sitemap, redirects (PS natif).
 */
import type { ResolvedPilier } from './tenant-piliers'

export interface CategoryPathInfo {
  /** Path localisé concaténé (ex "olive/lucque" ou "meyva/bucket"). */
  path: string
  /** Root pillar slug matched (e.g. 'grossiste', 'marque', 'decks').
   * Null if the category is outside the declared tiers. */
  pilier: string | null
}

/**
 * Loads the map id_category → { short localized path, root pillar } for a
 * list of IDs. Walk id_parent in memory (per-request cache), target language via
 * ps_category_lang.link_rewrite (fallback id_lang=1).
 *
 * Flat URL policy according to `truncate` of the pillar (see tenant-piliers.ts):
 *   - `truncate: 2` (Example Shop /grossiste/) : 2 segments leaf-most uniquement.
 *   - `truncate` absent : path complet (cas Example Shop /marque/, codemyshop-demo).
 *
 * Special case: if the category is itself a pillar (idCategory === pilier.id),
 * path='' → the product URL becomes `/{pilier-slug}/{slug}` (138 products at
 * Example Shop under /grossiste/ direct, 100% of codemyshop-demo products).
 *
 * Returns `{ path: '', pilier: null }` for categories not descending from any
 * pillar — the caller chooses its fallback URL (mode `noPilier` of
 * `buildProductUrlFromCategory`).
 */
export async function buildCategoryPathMap(
  db: any,
  ids: number[],
  idLang: number,
  piliersConfig: ResolvedPilier[],
): Promise<Map<number, CategoryPathInfo>> {
  if (!ids.length) return new Map()

  const rows = await db.query<{ id_category: number; id_parent: number; link_rewrite: string }>(
    `SELECT c.id_category, c.id_parent,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.active = 1`,
    [idLang],
  )
  const byId = new Map<number, { id_parent: number; link_rewrite: string }>()
  for (const r of rows) byId.set(r.id_category, { id_parent: r.id_parent, link_rewrite: r.link_rewrite })

  const pilierById = new Map<number, ResolvedPilier>()
  for (const p of piliersConfig) pilierById.set(p.idCategory, p)
  const cache = new Map<number, CategoryPathInfo>()

  const resolve = (id: number): CategoryPathInfo => {
    if (cache.has(id)) return cache.get(id)!

    // Cat-default = pilier lui-même → URL plate `/{pilier-slug}/{slug}`.
    if (pilierById.has(id)) {
      const v: CategoryPathInfo = { path: '', pilier: pilierById.get(id)!.slug }
      cache.set(id, v); return v
    }
    if (!byId.has(id)) { const v = { path: '', pilier: null as any }; cache.set(id, v); return v }

    // Walk parents en accumulant les link_rewrite leaf→racine (push). On stoppe
    // dès qu'on touche un pilier ou la racine Accueil (id<=2).
    const chainLeafFirst: string[] = []
    let cursor: number | null = id
    const guard = new Set<number>()
    let pilierMatch: ResolvedPilier | null = null
    while (cursor && !guard.has(cursor) && cursor > 2) {
      guard.add(cursor)
      if (pilierById.has(cursor)) { pilierMatch = pilierById.get(cursor)!; break }
      const row = byId.get(cursor)
      if (!row) break
      chainLeafFirst.push(row.link_rewrite)
      cursor = row.id_parent
    }
    // Si truncate défini sur le pilier matché → garde N segments leaf-most.
    // Sinon : full chain leaf→racine.
    const segments = pilierMatch?.truncate
      ? chainLeafFirst.slice(0, pilierMatch.truncate).reverse()
      : chainLeafFirst.slice().reverse()
    const info: CategoryPathInfo = {
      path: segments.join('/'),
      pilier: pilierMatch?.slug ?? null,
    }
    cache.set(id, info)
    return info
  }

  const out = new Map<number, CategoryPathInfo>()
  for (const id of ids) out.set(id, resolve(id))
  return out
}

/**
 * Construit l'URL produit finale depuis id_category_default + slug produit.
 *
 * Option `prefixesByPilier`: map pillar-slug → localized prefix (e.g. for DE
 * `{ grossiste: 'grossist', marque: 'marke' }`). If absent for a slug, the
 * raw slug is used as prefix (`/grossiste/...`).
 *
 * Option `noPilier`: if true, ignores pillars and builds `/{cat-path}/{slug}`.
 * Automatically enabled also if `info.pilier === null && info.path` not empty
 * (e.g. v2 root case, categories outside declared pillars).
 *
 * Option `productId`: if provided (>0), suffix `-{productId}` to slug for
 * guarantee uniqueness when the slug-cleaning automation produces slugs
 * collisionnaires.
 */
export function buildProductUrlFromCategory(
  idCategoryDefault: number,
  slug: string,
  pathMap: Map<number, CategoryPathInfo>,
  opts: {
    langPrefix: string
    prefixesByPilier?: Record<string, string>
    noPilier?: boolean
    productId?: number
  },
): string {
  const info = pathMap.get(idCategoryDefault)
  const slugFinal = opts.productId && opts.productId > 0 ? `${slug}-${opts.productId}` : slug

  // Mode racine : /{cat-path}/{slug} ou /{slug} si pas de path.
  if (opts.noPilier || (info && info.pilier === null && info.path)) {
    return info?.path
      ? `${opts.langPrefix}/${info.path}/${slugFinal}`
      : `${opts.langPrefix}/${slugFinal}`
  }
  // Mode pilier : /{prefix-localisé||slug-pilier}/{path-cat}/{slug-produit}
  const pilierSlug = info?.pilier ?? null
  const prefix = (pilierSlug && opts.prefixesByPilier?.[pilierSlug]) ?? pilierSlug ?? ''
  if (!prefix) {
    // Fallback : pas de pilier → URL racine
    return info?.path
      ? `${opts.langPrefix}/${info.path}/${slugFinal}`
      : `${opts.langPrefix}/${slugFinal}`
  }
  return info?.path
    ? `${opts.langPrefix}/${prefix}/${info.path}/${slugFinal}`
    : `${opts.langPrefix}/${prefix}/${slugFinal}`
}
