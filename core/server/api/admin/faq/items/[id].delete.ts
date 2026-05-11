

import { deleteFaqById } from '~/modules/faq/server/utils/faq'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const idStr = getRouterParam(event, 'id')
  const idFaq = Number(idStr)
  if (!idFaq || idFaq <= 0) {
    throw createError({ statusCode: 400, message: 'id_faq invalide' })
  }
  const ok = await deleteFaqById(idFaq, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'FAQ introuvable ou déjà supprimée' })
  }
  return { success: true }
})
