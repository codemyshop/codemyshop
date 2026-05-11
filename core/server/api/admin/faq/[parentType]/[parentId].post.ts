

import { saveSingleFaq } from '~/modules/faq/server/utils/faq'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const parentType = String(event.context.params?.parentType || '').trim()
  const parentId = Number(event.context.params?.parentId)
  if (!parentType) throw createError({ statusCode: 400, message: 'parentType requis' })
  if (!Number.isInteger(parentId) || parentId < 0) {
    throw createError({ statusCode: 400, message: 'parentId invalide' })
  }

  const body = await readBody<any>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  const langId = Number(body.lang) > 0 ? Number(body.lang) : 1

  const result = await saveSingleFaq(
    {
      parentType,
      parentId,
      langId,
      idFaq: Number(body.id_faq) || 0,
      question: String(body.question ?? ''),
      answer: String(body.answer ?? ''),
      position: typeof body.position === 'number' ? body.position : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    },
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: result.status, message: result.error })
  }
  return { success: true, id_faq: result.idFaq, created: result.created }
})
