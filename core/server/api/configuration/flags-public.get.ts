/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/configuration/flags-public
 *
 * Native PrestaShop flags exposed to public pages (not admin-protected).
 * Minimal whitelist — only flags that drive public rendering:
 *   - PS_B2B_ENABLE      (masquage prix, inscription SIRET/VAT)
 * - PS_CATALOG_MODE    (storefront without cart)
 * - PS_GUEST_CHECKOUT_ENABLED (guest checkout)
 *
 * Source: ps_configuration (PrestaShop database of the current instance).
 *
 * Used by the SSR plugin ps-flags which preloads them at SSR for
 * useB2bVisibility() / useCatalogMode() on the client side.
 */

import { useClientDb } from '~/server/utils/db'

const PUBLIC_WHITELIST = [
  'PS_B2B_ENABLE',
  'PS_CATALOG_MODE',
  'PS_GUEST_CHECKOUT_ENABLED',
] as const

type PublicFlagKey = typeof PUBLIC_WHITELIST[number]

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)
    const placeholders = PUBLIC_WHITELIST.map(() => '?').join(',')
    const rows = await db.query<{ name: string; value: string }>(
      `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
      PUBLIC_WHITELIST as unknown as string[],
    )

    const flags: Record<PublicFlagKey, string> = {} as Record<PublicFlagKey, string>
    for (const key of PUBLIC_WHITELIST) flags[key] = '0'
    for (const row of rows) {
      if ((PUBLIC_WHITELIST as readonly string[]).includes(row.name)) {
        flags[row.name as PublicFlagKey] = row.value
      }
    }

    // Cache 60s (les flags changent rarement + invalidation manuelle possible
    // via hub/informations save qui refresh le fetch SSR au prochain navigateto)
    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=300')

    return { flags }
  } catch (err: any) {
    console.error('[configuration/flags-public] DB error:', err.message)
    // Fail-soft : retourne flags à 0 si DB en rade — évite page blanche
    return { flags: Object.fromEntries(PUBLIC_WHITELIST.map(k => [k, '0'])) }
  }
})
