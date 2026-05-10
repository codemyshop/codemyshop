/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Server helper: translates the internal segments of a French category href to
 * localized slugs for a target language. Used by megamenu.get.ts,
 * footer.get.ts, etc. so that the frontend receives the hrefs
 * in the current language — useLocalePath on the frontend only needs to
 * prefix /:lang/ and translate the ROOT segment.
 *
 * Ex : '/grossiste/fruit-sec/datte/' + slugMap EN
 *   → '/grossiste/dried-fruit/datte/' (serveur)
 * → '/en/wholesaler/dried-fruit/datte/' (after localePath on the frontend)
 *
 * The root segment (wholesaler, brand, etc.) remains in FR in the response because
 * localePath translates it at render. Only segments AFTER the root are
 * transformed here.
 *
 * Source: ps_category + ps_category_lang (native PrestaShop). The filename
 * preserves "silo" for backward compatibility of external imports (the old silo
 * system was dropped — see backlog #155, merge 2026-04-19).
 *
 * Task #44 (2026-04-30): migrated MariaDB → PostgreSQL via `usePocPg()`.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

const CATEGORY_ROOTS = new Set(['grossiste', 'marque', 'marques'])
const PILIER_IDS: Record<string, number> = { product: 260, brand: 321 }

/**
 * Load a map Map<master_path_fr, slug_lang_terminal> for a target language.
 * Walk ps_category under the pillar (Wholesaler=260 or Brand=321) to build
 * the complete FR paths (concatenation of FR link_rewrite of ancestors) and
 * associate them with link_rewrite in the target language.
 *
 * Usage: 1 load per API request, shared across all transformations.
 */
export async function loadSiloSlugMapForLang(
  idLang: number,
  kind?: 'product' | 'brand',
): Promise<Map<string, string>> {
  if (idLang === 1) return new Map()  // fr : pas de transformation nécessaire
  const map = new Map<string, string>()

  const pilierIds = kind ? [PILIER_IDS[kind]] : [PILIER_IDS.product, PILIER_IDS.brand]

  try {
    // Fetch toutes les catégories actives avec slug FR + slug lang cible
    const result = await usePocPg().execute(sql`
      SELECT c.id_category, c.id_parent,
             COALESCE(clf.link_rewrite, '') AS slug_fr,
             COALESCE(cl.link_rewrite, clf.link_rewrite, '') AS slug_lang
        FROM cs_main.ps_category c
   LEFT JOIN cs_main.ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ${idLang} AND cl.id_shop = 1
   LEFT JOIN cs_main.ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1
    `)
    const rows = result as unknown as Array<{
      id_category: number
      id_parent: number
      slug_fr: string
      slug_lang: string
    }>

    const byId = new Map<number, { id_parent: number; slug_fr: string; slug_lang: string }>()
    for (const r of rows) {
      byId.set(r.id_category, {
        id_parent: r.id_parent,
        slug_fr: r.slug_fr,
        slug_lang: r.slug_lang || r.slug_fr,
      })
    }

    // Ne garder que les catégories descendantes des piliers demandés
    const isUnderPilier = (id: number): boolean => {
      const guard = new Set<number>()
      let cursor: number | null = id
      while (cursor && !guard.has(cursor)) {
        guard.add(cursor)
        if (pilierIds.includes(cursor)) return true
        const parent: number | undefined = byId.get(cursor)?.id_parent
        if (!parent) return false
        cursor = parent
      }
      return false
    }

    // Walk les ancêtres pour chaque catégorie, jusqu'au pilier (exclu).
    const pathCache = new Map<number, string>()
    const buildPathFr = (id: number): string => {
      if (pathCache.has(id)) return pathCache.get(id)!
      if (pilierIds.includes(id)) { pathCache.set(id, ''); return '' }
      const row = byId.get(id)
      if (!row) { pathCache.set(id, ''); return '' }
      const parentPath = pilierIds.includes(row.id_parent) ? '' : buildPathFr(row.id_parent)
      const p = parentPath ? `${parentPath}/${row.slug_fr}` : row.slug_fr
      pathCache.set(id, p)
      return p
    }

    for (const [id, row] of byId) {
      if (!isUnderPilier(id)) continue
      const pathFr = buildPathFr(id)
      if (pathFr) map.set(pathFr, row.slug_lang)
    }
  } catch { /* table absente */ }
  return map
}

/**
 * Transform the internal path of a category href by substituting each segment
 * FR master with its slug_lang (if present in the map). The root segment
 * (wholesaler, brand) remains FR — it will be translated on the frontend by localePath.
 *
 * Ex: href='/grossiste/fruit-sec/datte/medjool/', map EN
 * → '/grossiste/dried-fruit/datte/medjool/' (datte not translated, kept in FR)
 */
export function localizeSiloHref(
  href: string | null | undefined,
  slugMap: Map<string, string>,
): string | null {
  if (!href || typeof href !== 'string') return href ?? null
  if (slugMap.size === 0) return href

  // URL absolue / externe / ancre → inchangé
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('?')) return href

  // Parse : récupérer le premier segment (root) + le reste
  const clean = href.replace(/^\/+/, '').replace(/\/+$/, '')
  const segs = clean.split('/')
  if (segs.length < 2) return href
  const root = segs[0]
  if (!CATEGORY_ROOTS.has(root)) return href

  const innerSegs = segs.slice(1)
  // Walk cumulatif : pour chaque préfixe partiel, chercher le slug_lang terminal.
  // slugMap contient master_path_fr → slug_lang_terminal (dernier segment traduit).
  const out: string[] = []
  for (let i = 0; i < innerSegs.length; i++) {
    const partialMaster = innerSegs.slice(0, i + 1).join('/')
    const leafLang = slugMap.get(partialMaster)
    out.push(leafLang || innerSegs[i])
  }

  const trailing = href.endsWith('/') ? '/' : ''
  const leading = href.startsWith('/') ? '/' : ''
  return `${leading}${root}/${out.join('/')}${trailing}`
}
