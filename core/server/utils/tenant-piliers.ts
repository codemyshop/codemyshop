

export interface ResolvedPilier {
  
  idCategory: number
  
  slug: string
  

  truncate?: number
}

const CACHE = new Map<string, ResolvedPilier[]>()

function parsePilierEntry(raw: string): { slug: string; truncate?: number } {
  const colon = raw.indexOf(':')
  if (colon < 0) return { slug: raw }
  const slug = raw.slice(0, colon)
  const n = Number(raw.slice(colon + 1))
  return { slug, truncate: Number.isFinite(n) && n > 0 ? n : undefined }
}

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
    if (!id) continue 
    resolved.push({ idCategory: id, slug: p.slug, truncate: p.truncate })
  }
  CACHE.set(cacheKey, resolved)
  return resolved
}

export function _resetPiliersCache(): void {
  CACHE.clear()
}
