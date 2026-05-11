

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
