

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

const VERTICALS = new Set(['food', 'beauty', 'vape', 'fashion', 'services', 'electronics', 'generic'])
const CHANNELS = new Set(['pure-online', 'phygital', 'b2b-only', 'marketplace', 'mix'])

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; value?: string }>(event)
  const name = String(body?.name ?? '').trim()
  const value = String(body?.value ?? '').trim()

  if (name === 'PS_AC_TENANT_VERTICAL') {
    if (!VERTICALS.has(value)) {
      throw createError({ statusCode: 400, message: `Vertical invalide. Valeurs : ${[...VERTICALS].join(', ')}` })
    }
  } else if (name === 'PS_AC_TENANT_CHANNEL') {
    if (!CHANNELS.has(value)) {
      throw createError({ statusCode: 400, message: `Channel invalide. Valeurs : ${[...CHANNELS].join(', ')}` })
    }
  } else {
    throw createError({ statusCode: 400, message: `Clé '${name}' non autorisée` })
  }

  const db = useClientDb(event)
  await upsertConfiguration(db, name, value)

  return { ok: true, name, value }
})
