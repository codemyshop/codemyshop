

import { setRuntime } from '../../../../utils/module-registry'
import type { ModuleManifest } from '../../../../db/schema-pg/module-registry'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const codename = getRouterParam(event, 'codename')
  if (!codename) throw createError({ statusCode: 400, message: 'codename requis' })

  const body = await readBody<{ runtime: 'ps' | 'nuxt'; manifest?: ModuleManifest }>(event)
  if (!body || !['ps', 'nuxt'].includes(body.runtime)) {
    throw createError({ statusCode: 400, message: 'runtime invalide (ps|nuxt)' })
  }

  try {
    const updated = await setRuntime(codename, body.runtime, body.manifest ?? null, { event })
    return { ok: true, module: updated }
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err.message })
  }
})
