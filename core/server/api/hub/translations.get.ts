/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb, useClientDbById } from '~/server/utils/db'

/**
 * GET /api/hub/translations?lang=fr — traductions Hub depuis ps_translation.
 * Returns a flat object { "nav.orders": "Orders", ... }
 * Server-side cache 5 min.
 */

const cache: Record<string, { data: Record<string, string>; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { lang, clientId: qClientId } = getQuery(event) as { lang?: string; clientId?: string }
  const langCode = lang || 'fr'
  // En SSR plugin, $fetch interne ne propage pas les headers → le tenant est
  // passé explicitement en query param. Sinon résolution classique par hostname.
  const db = qClientId ? useClientDbById(qClientId) : useClientDb(event)

  const cacheKey = `${db.clientId}:${langCode}`
  const now = Date.now()
  if (cache[cacheKey] && now - cache[cacheKey].ts < CACHE_TTL) {
    return cache[cacheKey].data
  }

  try {
    // Résoudre id_lang depuis iso_code
    const langRow = await db.get<any>(`SELECT id_lang FROM ps_lang WHERE iso_code = ? AND active = 1`, [langCode])
    const idLang = langRow?.id_lang || 1

    const rows = await db.query<any>(`
      SELECT \`key\`, translation, domain
      FROM ps_translation
      WHERE id_lang = ? AND domain LIKE 'Hub%'
    `, [idLang])

    // Construire l'objet plat : domain "HubNav" + key "orders" → "nav.orders"
    const translations: Record<string, string> = {}
    for (const row of rows) {
      // Domain HubNav → préfixe "nav", HubOrders → "orders", HubCommon → "common"
      const prefix = row.domain.replace(/^Hub/, '').toLowerCase()
      const fullKey = prefix ? `${prefix}.${row.key}` : row.key
      translations[fullKey] = row.translation
    }

    cache[cacheKey] = { data: translations, ts: now }
    return translations
  } catch (err: any) {
    console.error('[hub/translations] error:', err?.message)
    return {}
  }
})
