/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/hub/configuration/payment
 *
 * Body : { name: 'BANK_WIRE_DETAILS', value: 'IBAN: FR76…\nBIC: …' }
 *
 * Update a payment key in ps_configuration. Strict whitelist. The
 * SystemPay keys (TEST_KEY/PROD_KEY/ID_SHOP) are **forbidden in the database**:
 * they remain in .env (security — no leaks via SQL injection or
 * database dump). Only SYSTEMPAY_MODE is editable from the UI.
 */

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

const WHITELIST = new Set([
  'BANK_WIRE_OWNER',
  'BANK_WIRE_DETAILS',
  'BANK_WIRE_ADDRESS',
  'BANK_WIRE_CUSTOM_TEXT',
  'SYSTEMPAY_MODE',
])

function validate(name: string, value: string): string | null {
  if (name === 'SYSTEMPAY_MODE' && value && !['TEST', 'PROD'].includes(value)) {
    return 'SYSTEMPAY_MODE doit être TEST ou PROD'
  }
  if (name === 'BANK_WIRE_DETAILS' && value.length > 500) return 'Coordonnées bancaires trop longues (max 500)'
  if (name === 'BANK_WIRE_OWNER' && value.length > 100) return 'Bénéficiaire trop long (max 100)'
  if (name === 'BANK_WIRE_ADDRESS' && value.length > 500) return 'Adresse banque trop longue (max 500)'
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; value?: string }>(event)
  const name = String(body?.name ?? '').trim()
  const value = String(body?.value ?? '')

  if (!name || !WHITELIST.has(name)) {
    throw createError({ statusCode: 400, message: `Clé '${name}' non autorisée` })
  }
  const err = validate(name, value)
  if (err) throw createError({ statusCode: 400, message: err })

  const db = useClientDb(event)
  await upsertConfiguration(db, name, value)

  return { ok: true, name, value }
})
