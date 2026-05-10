/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/configuration/payment
 *
 * Load the tenant's payment configuration:
 *   - BANK_WIRE_OWNER, BANK_WIRE_DETAILS, BANK_WIRE_ADDRESS, BANK_WIRE_CUSTOM_TEXT
 * → Bank account details displayed on the confirmation page and in the wire transfer email.
 * SYSTEMPAY_MODE (TEST/PROD) → mode used by /api/payment/systempay-form
 * and /api/payment/systempay-ipn. Read preferentially from process.env.
 *
 * SystemPay keys (TEST_KEY/PROD_KEY/ID_SHOP) are NEVER exposed to the frontend.
 * They live in the .env file on the VPS, we only return their presence (boolean).
 */

import { useClientDb } from '~/server/utils/db'

const DB_KEYS = [
  'BANK_WIRE_OWNER',
  'BANK_WIRE_DETAILS',
  'BANK_WIRE_ADDRESS',
  'BANK_WIRE_CUSTOM_TEXT',
  'SYSTEMPAY_MODE',
] as const

type ConfigKey = typeof DB_KEYS[number]

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const placeholders = DB_KEYS.map(() => '?').join(',')
  const rows = await db.query<{ name: string; value: string | null }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
    DB_KEYS as unknown as string[],
  ).catch(() => [])

  const config: Record<ConfigKey, string> = {} as Record<ConfigKey, string>
  for (const k of DB_KEYS) config[k] = ''
  for (const r of rows) {
    if ((DB_KEYS as readonly string[]).includes(r.name)) {
      config[r.name as ConfigKey] = r.value ?? ''
    }
  }

  // Fallback SYSTEMPAY_MODE depuis env si pas en DB (legacy : avant l'UI)
  if (!config.SYSTEMPAY_MODE) config.SYSTEMPAY_MODE = process.env.SYSTEMPAY_MODE || 'TEST'

  // Présence des clés sans les exposer (pour l'UI : badge "configuré" / "manquant")
  const env = process.env
  const keys = {
    SYSTEMPAY_ID_SHOP: !!env.SYSTEMPAY_ID_SHOP,
    SYSTEMPAY_TEST_KEY: !!env.SYSTEMPAY_TEST_KEY,
    SYSTEMPAY_PROD_KEY: !!env.SYSTEMPAY_PROD_KEY,
  }

  return { config, keys }
})
