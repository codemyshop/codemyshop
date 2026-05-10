/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-silo.xml — Sitemap for pillar categories (tenant-aware).
 *
 * Generates canonical FR URLs + hreflang alternates for all languages
 * actives (ps_lang). Source : ps_category + ps_category_lang.link_rewrite
 * (native PS i18n). The filename remains "sitemap-silo.xml" for backward-
 * compat (Google Search Console + backlinks externes).
 *
 * Refactor from the industrialization initiative 2026-05-08: the pillars
 * are resolved via runtimeConfig.public.piliers (more than 260/321 hardcoded).
 */
import {
  loadActiveLangs,
  buildUrlEntry,
  buildLocalizedPath,
  SITEMAP_XHTML_NS,
} from '~/server/utils/sitemap-i18n'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'

interface CategoryRow {
  id_category: number
  id_parent: number
  level_depth: number
  slug_fr: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const psFrontUrl = (config.public.psFrontUrl as string) || ''
  const base = psFrontUrl.replace(/\/$/, '')
  const now = new Date().toISOString().split('T')[0]

  const db = useClientDb(event)
  const locales: string[] = ((config.public as any).i18nLocales as string[]) || ['en']
  const langs = await loadActiveLangs(db, locales)

  // Fetch toutes les cats actives + leur link_rewrite par langue
  const catRows = await db.query<CategoryRow>(
    `SELECT c.id_category, c.id_parent, c.level_depth,
            COALESCE(clf.link_rewrite, '') AS slug_fr
       FROM ps_category c
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.active = 1`,
  ).catch(() => [] as CategoryRow[])

  const byId = new Map<number, CategoryRow>()
  for (const r of catRows) byId.set(r.id_category, r)

  // Map id_category → link_rewrite par id_lang (langs.length petit ≤ 3)
  const slugByLangByCat = new Map<number, Map<number, string>>()
  for (const l of langs) {
    const rows = await db.query<{ id_category: number; link_rewrite: string }>(
      `SELECT id_category, COALESCE(link_rewrite, '') AS link_rewrite
         FROM ps_category_lang WHERE id_lang = ? AND id_shop = 1`,
      [l.id_lang],
    )
    for (const r of rows) {
      if (!slugByLangByCat.has(r.id_category)) slugByLangByCat.set(r.id_category, new Map())
      slugByLangByCat.get(r.id_category)!.set(l.id_lang, r.link_rewrite)
    }
  }

  // Résolution dynamique des piliers tenant.
  const piliers = await resolveTenantPiliers(event, db, 1)
  const pilierIds = new Set(piliers.map(p => p.idCategory))
  const pilierSlugById = new Map(piliers.map(p => [p.idCategory, p.slug]))

  // Walk ancestors pour construire le path FR et le path localisé par langue.
  const buildPath = (id: number, idLang: number): { path: string; pilierId: number | null } => {
    const chain: string[] = []
    let cursor: number | null = id
    const guard = new Set<number>()
    let pilierId: number | null = null
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor)
      if (pilierIds.has(cursor)) { pilierId = cursor; break }
      const row = byId.get(cursor)
      if (!row) break
      const slug = slugByLangByCat.get(cursor)?.get(idLang) || row.slug_fr
      chain.unshift(slug)
      cursor = row.id_parent
    }
    return { path: chain.join('/'), pilierId }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${SITEMAP_XHTML_NS}>\n`

  // Roots /<pilier-slug>/ — un par pilier déclaré dans le tenant config.
  for (const p of piliers) {
    xml += buildUrlEntry(
      `${base}/${p.slug}/`,
      langs.map(l => ({ iso: l.iso_code, url: `${base}${buildLocalizedPath('/' + p.slug + '/', l.iso_code)}` })),
      now, 'weekly', '0.9',
    )
  }

  // URLs catégorie (descendants des piliers uniquement)
  for (const cat of catRows) {
    const { path: pathFr, pilierId } = buildPath(cat.id_category, 1)
    if (!pilierId || !pathFr) continue
    const rootSeg = pilierSlugById.get(pilierId) || ''
    if (!rootSeg) continue
    const priority = cat.level_depth === 3 ? '0.8' : cat.level_depth === 4 ? '0.7' : '0.6'

    const locFr = `${base}/${rootSeg}/${pathFr}/`
    const variants = langs.map(l => {
      const { path: pathLang } = buildPath(cat.id_category, l.id_lang)
      const fullRoot = buildLocalizedPath(`/${rootSeg}/`, l.iso_code)
      return { iso: l.iso_code, url: `${base}${fullRoot}${pathLang}/` }
    })
    xml += buildUrlEntry(locFr, variants, now, 'weekly', priority)
  }

  xml += '</urlset>'

  setResponseHeader(event, 'content-type', 'application/xml')
  return xml
})
