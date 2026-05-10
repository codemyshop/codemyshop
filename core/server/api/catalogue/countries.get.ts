/**
 *
 * GET /api/catalogue/countries?clientId=...&lang=fr
 *
 * Returns active countries (used by address/shipping forms).
 * Direct DB (principle 'Zero PrestaShop webservice' 2026-04-22). Refactored
 * depuis connector.getCountries.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

interface CountryRow {
  id_country: number
  iso_code: string
  name: string
  call_prefix: number
}

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(clientId) : useClientDb(event)

  try {
    const rows = await db.query<CountryRow>(
      `SELECT c.id_country, c.iso_code, c.call_prefix,
              COALESCE(cl.name, clf.name, '') AS name
         FROM ps_country c
    LEFT JOIN ps_country_lang cl  ON cl.id_country  = c.id_country AND cl.id_lang  = ?
    LEFT JOIN ps_country_lang clf ON clf.id_country = c.id_country AND clf.id_lang = 1
        WHERE c.active = 1
        ORDER BY cl.name`,
      [idLang],
    )
    return rows.map((r) => ({
      id: Number(r.id_country),
      iso: String(r.iso_code || ''),
      name: String(r.name || ''),
      callPrefix: Number(r.call_prefix || 0),
    }))
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return []
    console.error('[countries] DB error:', err?.message)
    return []
  }
})
