/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Dynamic resolution of SEO pillars for a tenant — industrialization initiative
 * codemyshop-industrialisation 2026-05-08.
 *
 * Before this module, `core/server/utils/category-path.ts` hardcoded the IDs
 * for a tenant (PILIER_GROSSISTE=260, PILIER_MARQUE=321). Now each tenant
 * declares its pillars via `runtimeConfig.public.piliers: string[]` and their
 * id_category are resolved at runtime from ps_category_lang.link_rewrite.
 *
 * Format of pillar entries:
 * - `'grossiste'`         → pillar "grossiste", full path under /grossiste/
 * - `'grossiste:2'`       → pillar "grossiste", path truncated to 2 segments
 *                             (politique flat Example Shop, leaf-most kept)
 *   - `'marque'`            → pilier "marque", full path
 *
 * LRU cache by clientId (pillars do not change at runtime — infinite TTL
 * jusqu'au reload Nuxt).
 */

export interface ResolvedPilier {
  /** id_category dans la DB tenant (résolu depuis link_rewrite). */
  idCategory: number
  /** Slug navigationnel (= link_rewrite, ex 'grossiste', 'decks'). */
  slug: string
  /** If defined: truncates the path to N leaf-most segments under this pillar.
   * If absent or 0: full path preserved (case /marque/ for the default tenant and all
   *  tenants flat comme codemyshop-demo). */
  truncate?: number
}

const CACHE = new Map<string, ResolvedPilier[]>()

/** Parse `'<slug>'` ou `'<slug>:<truncate>'` → { slug, truncate? } */
function parsePilierEntry(raw: string): { slug: string; truncate?: number } {
  const colon = raw.indexOf(':')
  if (colon < 0) return { slug: raw }
  const slug = raw.slice(0, colon)
  const n = Number(raw.slice(colon + 1))
  return { slug, truncate: Number.isFinite(n) && n > 0 ? n : undefined }
}

/**
 * Resolves the list of pillars for the current tenant by querying ps_category_lang
 * to match the declared link_rewrite in runtimeConfig.public.piliers.
 *
 * Returns [] if:
 * - the tenant declares no pillars (legacy case or flat catalog)
 * - the declared link_rewrite do not exist in the DB (broken configuration)
 *
 * Callers of category-path.ts must handle the empty array case via the
 * mode `noPilier`.
 */
export async function resolveTenantPiliers(
  event: any,
  db: any,
  idLang: number = 1,
): Promise<ResolvedPilier[]> {
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || cfg.public?.clientId || 'ac-hub')
  const cacheKey = `${clientId}:${idLang}`

  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)!

  const rawPiliers = (cfg.public as any)?.piliers as string[] | undefined
  if (!Array.isArray(rawPiliers) || !rawPiliers.length) {
    CACHE.set(cacheKey, [])
    return []
  }

  const parsed = rawPiliers.map(parsePilierEntry)
  const slugs = parsed.map((p) => p.slug)

  const placeholders = slugs.map(() => '?').join(',')
  const rows = await db.query<{ id_category: number; link_rewrite: string }>(
    `SELECT cl.id_category, cl.link_rewrite
       FROM ps_category_lang cl
       JOIN ps_category c ON c.id_category = cl.id_category
      WHERE cl.id_lang = ?
        AND cl.id_shop = 1
        AND cl.link_rewrite IN (${placeholders})
        AND c.active = 1`,
    [idLang, ...slugs],
  )
  const idBySlug = new Map<string, number>()
  for (const r of rows) idBySlug.set(r.link_rewrite, r.id_category)

  // Fallback id_lang=1 si manque dans la lang demandée
  if (idBySlug.size < slugs.length && idLang !== 1) {
    const missing = slugs.filter((s) => !idBySlug.has(s))
    const placeholdersFallback = missing.map(() => '?').join(',')
    const rowsFb = await db.query<{ id_category: number; link_rewrite: string }>(
      `SELECT cl.id_category, cl.link_rewrite
         FROM ps_category_lang cl
         JOIN ps_category c ON c.id_category = cl.id_category
        WHERE cl.id_lang = 1
          AND cl.id_shop = 1
          AND cl.link_rewrite IN (${placeholdersFallback})
          AND c.active = 1`,
      missing,
    )
    for (const r of rowsFb) if (!idBySlug.has(r.link_rewrite)) idBySlug.set(r.link_rewrite, r.id_category)
  }

  const resolved: ResolvedPilier[] = []
  for (const p of parsed) {
    const id = idBySlug.get(p.slug)
    if (!id) continue // slug declaré mais pas trouvé en DB → ignoré (config cassée)
    resolved.push({ idCategory: id, slug: p.slug, truncate: p.truncate })
  }
  CACHE.set(cacheKey, resolved)
  return resolved
}

/** Reset cache — réservé aux tests/dev. */
export function _resetPiliersCache(): void {
  CACHE.clear()
}
