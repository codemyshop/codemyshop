

import acHub      from '~/config/clients/ac-hub'
import codemyshop from '~/config/clients/codemyshop'
import smokevape  from '~/config/clients/smokevape'
import {
  clientConfigExists,
  upsertClientConfigJson,
} from '~/internal/clientconfig/server/utils/clientconfig'
import { verifyToken } from '~/server/utils/session-crypto'

const SOURCE_REGISTRY: Record<string, any> = {
  'ac-hub':       acHub,
  'codemyshop':   codemyshop,
  'example-vape': smokevape,
}

const SLICE_KEYS = ['theme', 'header', 'footer', 'homepage', 'sections'] as const

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  const body = await readBody<{ sourceClientId?: string; targetClientId?: string; force?: boolean }>(event)
  const source = body.sourceClientId
  const target = body.targetClientId
  const force  = body.force === true

  if (!source || !target) {
    throw createError({ statusCode: 400, message: 'sourceClientId et targetClientId requis' })
  }
  if (!/^[a-z0-9-]+$/.test(target)) {
    throw createError({ statusCode: 400, message: 'targetClientId invalide' })
  }
  const src = SOURCE_REGISTRY[source]
  if (!src) {
    throw createError({ statusCode: 400, message: `sourceClientId inconnu: ${source}` })
  }

  
  const payload: Record<string, unknown> = {}
  for (const key of ['theme', 'footer', 'homepage', 'sections'] as const) {
    if (key in src) payload[key] = (src as any)[key]
  }
  
  const { theme: _t, footer: _f, homepage: _hp, sections: _s, ...headerSlice } = src
  payload.header = headerSlice

  payload.clientId = target
  payload.savedAt = new Date().toISOString()

  try {
    if (!force) {
      const exists = await clientConfigExists(target, { global: true })
      if (exists) {
        return { success: false, reason: 'already_exists', clientId: target, hint: 'utiliser force=true pour écraser' }
      }
    }

    const configJson = JSON.stringify(payload)
    await upsertClientConfigJson(target, configJson, { global: true })

    return {
      success: true,
      clientId: target,
      sourceClientId: source,
      slices: SLICE_KEYS.filter(k => k in payload),
      bytes: configJson.length,
    }
  } catch (err: any) {
    console.error('[seed-client-config] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
