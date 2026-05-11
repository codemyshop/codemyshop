

import { useClientDb } from '~/server/utils/db'
import { STATIC_SCOPES, GROUP_SCOPES, buildPsTranslationScope } from '~/server/utils/translate-scopes'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  
  const tables = new Set<string>()
  try {
    const rows = await db.query<any>(`SHOW TABLES`)
    for (const r of rows) {
      const name = Object.values(r)[0] as string
      if (name) tables.add(name)
    }
  } catch {
    
  }

  const staticScopes = STATIC_SCOPES.filter(s => tables.size === 0 || tables.has(s.table))

  
  const dynamicScopes: any[] = []
  if (tables.size === 0 || tables.has('ps_translation')) {
    try {
      const domains = await db.query<{ domain: string; cnt: number }>(
        `SELECT domain, COUNT(*) AS cnt FROM ps_translation GROUP BY domain ORDER BY domain ASC`,
      )
      for (const d of domains) {
        const scope = buildPsTranslationScope(d.domain)
        dynamicScopes.push({ ...scope, rowCount: Number(d.cnt) })
      }
    } catch {
      
    }
  }

  
  const staticSlugs = new Set(staticScopes.map(s => s.slug))
  const groupScopes = GROUP_SCOPES.filter(g => {
    if (g.dynamicPsTranslationPrefix) return tables.size === 0 || tables.has('ps_translation')
    return g.members.some(m => staticSlugs.has(m))
  }).map(g => ({
    slug: g.slug,
    label: g.label,
    category: g.category,
    memberCount: g.members.length || (g.dynamicPsTranslationPrefix ? dynamicScopes.filter(d => d.domain?.startsWith(g.dynamicPsTranslationPrefix!)).length : 0),
    isGroup: true,
  }))

  return {
    staticScopes,
    dynamicScopes,
    groupScopes,
  }
})
