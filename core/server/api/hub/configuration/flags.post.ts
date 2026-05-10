/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/hub/configuration/flags
 *
 * Body : { name: 'PS_B2B_ENABLE', value: '0' | '1' }
 *
 * Updates a native PS flag in ps_configuration. Strict whitelist — a call
 * with a `name` outside the list is rejected with 400.
 *
 * PS convention: ps_configuration has 1 row per key (no deduplication
 * lang/shop for boolean flags). Upsert via helper `upsertConfiguration`
 * (UPDATE-then-INSERT app-level — no unique index on `name` on the PG side
 * post-port chantier #44).
 *
 * Security: protected by hub-auth middleware (authenticated employee only).
 */

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

const WHITELIST_KEYS = new Set([
  'PS_B2B_ENABLE',
  'PS_B2B_HIDE_PRICES',
  'PS_CATALOG_MODE',
  'PS_GUEST_CHECKOUT_ENABLED',
  'PS_ORDER_RETURN',
])

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; value?: string | number }>(event)
  const name = String(body?.name ?? '').trim()
  const value = String(body?.value ?? '').trim()

  if (!name || !WHITELIST_KEYS.has(name)) {
    throw createError({ statusCode: 400, message: `Flag '${name}' non autorisé` })
  }
  if (!/^[0-9]+$/.test(value)) {
    throw createError({ statusCode: 400, message: 'value doit être un entier (0 ou 1 pour les booléens)' })
  }

  try {
    const db = useClientDb(event)
    await upsertConfiguration(db, name, value)
    return { ok: true, name, value }
  } catch (err: any) {
    console.error('[hub/configuration/flags.post] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
