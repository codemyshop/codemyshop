/**
 *
 * POST /api/admin/seed-client-config
 * Materializes a `cs_client_config` row for a tenant from
 * the static file `core/config/clients/<source>.ts` (which serves
 * as the default schema for tenant bootstrapping).
 *
 * Body : { sourceClientId: 'example-shop', targetClientId: 'example-shop', force?: boolean }
 *
 * Pattern: the static TS = default schema for provisioning.
 * The cs_client_config DB = runtime source of truth edited by the builder.
 * Once seeded, the tenant no longer depends on the static file.
 *
 * Reserved for owner/developer.
 */

import acHub      from '~/config/clients/ac-hub'
import codemyshop from '~/config/clients/codemyshop'
import smokevape  from '~/config/clients/smokevape'
import {
  clientConfigExists,
  upsertClientConfigJson,
} from '~/internal/clientconfig/server/utils/clientconfig'
import { verifyToken } from '~/server/utils/session-crypto'

// example-shop retiré du registry : DB tenant 100% seedée (Vague 4 final).
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

  // Extraction des slices builder
  const payload: Record<string, unknown> = {}
  for (const key of ['theme', 'footer', 'homepage', 'sections'] as const) {
    if (key in src) payload[key] = (src as any)[key]
  }
  // header = tout ce qui n'est pas une slice (logo, topBar, menu, features, etc.)
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
