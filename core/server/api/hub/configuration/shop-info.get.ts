/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/configuration/shop-info
 *
 * Return the tenant's company information stored in ps_configuration
 * (native PS). SIRET/SIREN are custom keys added by us (no schema
 * additionnel, pattern PS standard).
 *
 * Source of truth: ps_configuration. Used by the "Company" tab of
 * /hub/informations.
 */

import { useClientDb } from '~/server/utils/db'

const WHITELIST_KEYS = [
  'PS_SHOP_NAME',
  'PS_SHOP_SIRET',
  'PS_SHOP_SIREN',
  'PS_SHOP_PHONE',
  'PS_SHOP_EMAIL',
  'PS_SHOP_ADDR1',
  'PS_SHOP_ADDR2',
  'PS_SHOP_CODE',
  'PS_SHOP_CITY',
  'PS_SHOP_COUNTRY_ID',
  'PS_AC_TENANT_AUDIENCE',
] as const

type InfoKey = typeof WHITELIST_KEYS[number]

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)
    const placeholders = WHITELIST_KEYS.map(() => '?').join(',')
    const rows = await db.query<{ name: string; value: string | null }>(
      `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
      WHITELIST_KEYS as unknown as string[],
    )

    const info: Record<InfoKey, string> = {} as Record<InfoKey, string>
    for (const key of WHITELIST_KEYS) info[key] = ''
    for (const row of rows) {
      if ((WHITELIST_KEYS as readonly string[]).includes(row.name)) {
        info[row.name as InfoKey] = row.value ?? ''
      }
    }

    return { info }
  } catch (err: any) {
    console.error('[hub/configuration/shop-info] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
