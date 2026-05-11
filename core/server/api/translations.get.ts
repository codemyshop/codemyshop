

import { useClientDb, useClientDbById } from '~/server/utils/db'

const cache: Record<string, { data: Record<string, string>; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { lang, clientId: qClientId } = getQuery(event) as { lang?: string; clientId?: string }
  const langCode = lang || 'fr'
  const db = qClientId ? useClientDbById(qClientId) : useClientDb(event)

  const cacheKey = `${db.clientId}:${langCode}`
  const now = Date.now()
  if (cache[cacheKey] && now - cache[cacheKey].ts < CACHE_TTL) {
    return cache[cacheKey].data
  }

  try {
    const langRow = await db.get<{ id_lang: number }>(
      `SELECT id_lang FROM ps_lang WHERE iso_code = ? AND active = 1`,
      [langCode],
    )
    const idLang = langRow?.id_lang || 1
    const tenantDomain = `tenant:${db.clientId}`

    const rows = await db.query<{ key: string; translation: string; domain: string }>(
      `SELECT "key", translation, domain
         FROM ps_translation
        WHERE id_lang = ? AND domain IN (?, ?)`,
      [idLang, 'oss', tenantDomain],
    )

    
    const dict: Record<string, string> = {}
    for (const r of rows) if (r.domain === 'oss') dict[r.key] = r.translation
    for (const r of rows) if (r.domain === tenantDomain) dict[r.key] = r.translation

    cache[cacheKey] = { data: dict, ts: now }
    return dict
  } catch (err: any) {
    console.error('[api/translations] error:', err?.message)
    return {}
  }
})
