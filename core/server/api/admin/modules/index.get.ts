

import { listModules, getRuntimeStats } from '../../../utils/module-registry'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const q = getQuery(event)
  const runtime = q.runtime as 'ps' | 'nuxt' | undefined
  const status = q.status as 'active' | 'disabled' | 'deprecated' | undefined

  if (runtime && !['ps', 'nuxt'].includes(runtime)) {
    throw createError({ statusCode: 400, message: 'runtime invalide' })
  }
  if (status && !['active', 'disabled', 'deprecated'].includes(status)) {
    throw createError({ statusCode: 400, message: 'status invalide' })
  }

  const [modules, stats] = await Promise.all([
    listModules({ runtime, status }, { event }),
    getRuntimeStats({ event }),
  ])

  return { modules, stats }
})
