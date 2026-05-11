

import { localizeRootSegment } from '~/utils/locale-route-roots'

export const SITEMAP_XHTML_NS = ' xmlns:xhtml="http://www.w3.org/1999/xhtml"'

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export async function loadActiveLangs(db: any, locales: string[] = ['en']): Promise<ActiveLang[]> {
  try {
    const rows = await db.query<ActiveLang>(
      `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1 ORDER BY id_lang ASC`,
    )
    if (!rows.length) return [{ id_lang: 1, iso_code: 'fr' }]
    const whitelist = new Set<string>(['fr', ...locales])
    return rows.filter(r => whitelist.has(r.iso_code))
  } catch {
    return [{ id_lang: 1, iso_code: 'fr' }]
  }
}

export function buildLocalizedPath(rawPath: string, iso: string): string {
  if (!rawPath.startsWith('/')) rawPath = '/' + rawPath
  if (iso === 'fr') return rawPath
  
  const firstSlash = rawPath.indexOf('/', 1)
  const firstSeg = firstSlash > 0 ? rawPath.slice(1, firstSlash) : rawPath.slice(1)
  const rest = firstSlash > 0 ? rawPath.slice(firstSlash) : ''
  const translatedRoot = localizeRootSegment(firstSeg, iso)
  return `/${iso}/${translatedRoot}${rest}`
}

export async function loadLocalizedSlugMap(
  db: any,
  table: string,
  masterTable: string,
  idCol: string,
  pathCol: string,
  masterSlugCol: string,
  slugCol: string,
  kind?: string,
): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>()
  try {
    const kindFilter = kind ? `AND m.kind='${kind}'` : ''
    const rows = await db.query<any>(
      `SELECT m.${pathCol} AS master_path, m.${masterSlugCol} AS master_slug,
              l.id_lang, l.${slugCol} AS slug_lang
         FROM ${masterTable} m
         JOIN ${table} l ON l.${idCol} = m.${idCol}
         JOIN ps_lang ps ON ps.id_lang = l.id_lang AND ps.active = 1
        WHERE m.active = 1 ${kindFilter}`,
    )
    
    const byPathIso = new Map<string, Record<number, string>>()
    const idLangToIso = new Map<number, string>()
    const isoRows = await db.query<ActiveLang>(`SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`)
    for (const r of isoRows) idLangToIso.set(r.id_lang, r.iso_code)
    for (const r of rows) {
      if (!byPathIso.has(r.master_path)) byPathIso.set(r.master_path, {})
      byPathIso.get(r.master_path)![r.id_lang] = r.slug_lang || r.master_slug
    }
    for (const [path, byIso] of byPathIso) {
      const isoMap: Record<string, string> = {}
      for (const [idLangStr, slug] of Object.entries(byIso)) {
        const iso = idLangToIso.get(Number(idLangStr))
        if (iso) isoMap[iso] = slug
      }
      map.set(path, isoMap)
    }
  } catch {  }
  return map
}

export function buildLocalizedSiloPath(
  masterPath: string,
  iso: string,
  slugMap: Map<string, Record<string, string>>,
): string {
  if (iso === 'fr' || !masterPath) return masterPath
  const segs = masterPath.split('/')
  const out: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const partial = segs.slice(0, i + 1).join('/')
    const entry = slugMap.get(partial)
    out.push(entry?.[iso] || segs[i])
  }
  return out.join('/')
}

export function buildUrlEntry(
  loc: string,
  langsWithUrls: Array<{ iso: string; url: string }>,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  let x = `  <url>\n`
  x += `    <loc>${escapeXml(loc)}</loc>\n`
  x += `    <lastmod>${lastmod}</lastmod>\n`
  x += `    <changefreq>${changefreq}</changefreq>\n`
  x += `    <priority>${priority}</priority>\n`
  for (const { iso, url } of langsWithUrls) {
    x += `    <xhtml:link rel="alternate" hreflang="${iso}" href="${escapeXml(url)}" />\n`
  }
  
  const fr = langsWithUrls.find(l => l.iso === 'fr')
  if (fr) x += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(fr.url)}" />\n`
  x += `  </url>\n`
  return x
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
