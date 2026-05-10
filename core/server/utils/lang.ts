/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Resolve PrestaShop id_lang from an HTTP request.
 *
 * DB-First: the iso_code → id_lang mapping comes from ps_lang (each tenant
 * has its own IDs). 5-minute in-memory cache per tenant to avoid a
 * DB round trip on each catalog request.
 *
 * Resolution priority:
 * 1. Query param ?lang=fr   (iso_code) or ?lang=2 (numeric id)
 * 2. Header X-Lang: fr      (for internal $fetch SSR)
 * 3. Fallback → 1           (French by default)
 */
import type { H3Event } from 'h3'
import { useClientDb } from './db'

/** Cache par tenant : { iso_code → id_lang } + timestamp */
const langCache: Record<string, { map: Record<string, number>; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

/**
 * Load the iso_code → id_lang mapping from ps_lang for the current tenant.
 * Result cached for 5 minutes.
 */
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

/**
 * Resolve the PrestaShop id_lang for the current request.
 *
 * Accept ?lang=fr (iso_code) or ?lang=2 (numeric id direct).
 * Fallback: 1 (French).
 */
export async function resolveIdLang(event: H3Event): Promise<number> {
  // 1. Query param ?lang=
  const q = getQuery(event)
  const raw = String(q.lang ?? '').trim().toLowerCase()

  // 2. Header X-Lang (fallback pour $fetch SSR internes)
  const headerLang = raw || (getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()

  if (!headerLang) return 1

  // Si c'est un entier direct (ex: ?lang=2), l'utiliser tel quel
  const asNum = Number(headerLang)
  if (Number.isInteger(asNum) && asNum > 0) return asNum

  // Sinon c'est un iso_code (ex: ?lang=fr) — résoudre via ps_lang
  if (/^[a-z]{2}$/.test(headerLang)) {
    const map = await getLangMap(event)
    return map[headerLang] ?? 1
  }

  return 1
}
