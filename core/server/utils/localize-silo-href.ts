

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

const CATEGORY_ROOTS = new Set(['grossiste', 'marque', 'marques'])
const PILIER_IDS: Record<string, number> = { product: 260, brand: 321 }

export async function loadSiloSlugMapForLang(
  idLang: number,
  kind?: 'product' | 'brand',
): Promise<Map<string, string>> {
  if (idLang === 1) return new Map()  
  const map = new Map<string, string>()

  const pilierIds = kind ? [PILIER_IDS[kind]] : [PILIER_IDS.product, PILIER_IDS.brand]

  try {
    
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
  } catch {  }
  return map
}

export function localizeSiloHref(
  href: string | null | undefined,
  slugMap: Map<string, string>,
): string | null {
  if (!href || typeof href !== 'string') return href ?? null
  if (slugMap.size === 0) return href

  
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('?')) return href

  
  const clean = href.replace(/^\/+/, '').replace(/\/+$/, '')
  const segs = clean.split('/')
  if (segs.length < 2) return href
  const root = segs[0]
  if (!CATEGORY_ROOTS.has(root)) return href

  const innerSegs = segs.slice(1)
  
  
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
