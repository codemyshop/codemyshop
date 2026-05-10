/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/hub/configuration/shop-info
 *
 * Body : { name: 'PS_SHOP_SIRET', value: '12345678900014' }
 *
 * Update a company field (ps_configuration). Strict whitelist. SIRET/SIREN
 * validated (digits only, 14/9 characters). Email validated for format.
 * PS_SHOP_COUNTRY_ID must be an integer (FK ps_country).
 */

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

const WHITELIST_KEYS = new Set([
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
])

function validate(name: string, value: string): string | null {
  if (!value) return null
  if (name === 'PS_SHOP_SIRET' && !/^\d{14}$/.test(value)) return 'SIRET doit faire 14 chiffres'
  if (name === 'PS_SHOP_SIREN' && !/^\d{9}$/.test(value)) return 'SIREN doit faire 9 chiffres'
  if (name === 'PS_SHOP_COUNTRY_ID' && !/^\d+$/.test(value)) return 'ID pays doit être un entier'
  if (name === 'PS_SHOP_EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide'
  if (name === 'PS_AC_TENANT_AUDIENCE' && value.length > 2000) return 'Brief audience trop long (max 2000 caractères)'
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; value?: string }>(event)
  const name = String(body?.name ?? '').trim()
  const value = String(body?.value ?? '').trim()

  if (!name || !WHITELIST_KEYS.has(name)) {
    throw createError({ statusCode: 400, message: `Clé '${name}' non autorisée` })
  }
  const err = validate(name, value)
  if (err) throw createError({ statusCode: 400, message: err })

  try {
    const db = useClientDb(event)
    await upsertConfiguration(db, name, value)
    return { ok: true, name, value }
  } catch (e: any) {
    console.error('[hub/configuration/shop-info.post] DB error:', e.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + e.message })
  }
})
