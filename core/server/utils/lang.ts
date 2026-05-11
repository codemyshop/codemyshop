

import type { H3Event } from 'h3'
import { useClientDb } from './db'

const langCache: Record<string, { map: Record<string, number>; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

async function getLangMap(event: H3Event): Promise<Record<string, number>> {
  const db = useClientDb(event)
  const key = db.clientId
  const now = Date.now()

  if (langCache[key] && now - langCache[key].ts < CACHE_TTL) {
    return langCache[key].map
  }

  try {
    const rows = await db.query<{ id_lang: number; iso_code: string }>(
      `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`,
    )
    const map: Record<string, number> = {}
    for (const r of rows) {
      map[r.iso_code.toLowerCase()] = Number(r.id_lang)
    }
    langCache[key] = { map, ts: now }
    return map
  } catch {
    return { fr: 1 }
  }
}

export async function resolveIdLang(event: H3Event): Promise<number> {
  
  const q = getQuery(event)
  const raw = String(q.lang ?? '').trim().toLowerCase()

  
  const headerLang = raw || (getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()

  if (!headerLang) return 1

  
  const asNum = Number(headerLang)
  if (Number.isInteger(asNum) && asNum > 0) return asNum

  
  if (/^[a-z]{2}$/.test(headerLang)) {
    const map = await getLangMap(event)
    return map[headerLang] ?? 1
  }

  return 1
}
