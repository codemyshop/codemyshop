

import { deleteProjectDocument } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idDocument = Number(idStr)
  if (!idDocument || idDocument <= 0) {
    throw createError({ statusCode: 400, message: 'ID de document invalide' })
  }
  const ok = await deleteProjectDocument(idDocument, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Document introuvable' })
  }
  return { success: true }
})
