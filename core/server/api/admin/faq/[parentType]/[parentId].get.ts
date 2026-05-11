

import { listFaqsByParent } from '../../../../../modules/faq/server/utils/faq'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const parentType = String(event.context.params?.parentType || '').trim()
  const parentId = Number(event.context.params?.parentId)

  if (!parentType) throw createError({ statusCode: 400, message: 'parentType requis' })
  if (!Number.isInteger(parentId) || parentId <= 0) {
    throw createError({ statusCode: 400, message: 'parentId invalide' })
  }

  const q = getQuery(event)
  const langId = Number(q.lang) > 0 ? Number(q.lang) : 1
  const onlyActive = q.onlyActive === '0' ? false : true

  const faqs = await listFaqsByParent(parentType, parentId, langId, { event }, { onlyActive })

  return { parentType, parentId, langId, count: faqs.length, faqs }
})
