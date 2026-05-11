

import { getModule } from '../../../utils/module-registry'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const codename = getRouterParam(event, 'codename')
  if (!codename) throw createError({ statusCode: 400, message: 'codename requis' })

  const row = await getModule(codename, { event })
  if (!row) throw createError({ statusCode: 404, message: `module inconnu : ${codename}` })

  return row
})
