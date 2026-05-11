

import { getAiQueueStatus } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idQueue = Number(idStr)
  if (!idQueue || idQueue <= 0) {
    throw createError({ statusCode: 400, message: 'id_queue invalide' })
  }
  const row = await getAiQueueStatus(idQueue, { event })
  if (!row) {
    throw createError({ statusCode: 404, message: 'Entrée introuvable' })
  }
  return {
    success: true,
    id_queue: row.id_queue,
    status: row.status,
    result_html: row.result_html,
    error_msg: row.error_msg,
  }
})
