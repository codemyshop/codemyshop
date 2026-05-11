

import { deleteAttachment } from '~/server/utils/attachments-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) throw createError({ statusCode: 400, message: 'id produit invalide' })

  const body = await readBody<{ id_attachment?: number }>(event)
  const idAttachment = Number(body?.id_attachment || 0)
  if (idAttachment <= 0) {
    throw createError({ statusCode: 422, message: 'id_attachment requis' })
  }

  const result = await deleteAttachment(id, idAttachment, { event })
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'delete KO' })
  }
  return {
    success: true,
    unlinked: result.unlinked,
    orphan_purged: result.orphanPurged,
    physical_removed: result.physicalRemoved,
    remaining_on_product: result.remainingOnProduct,
  }
})
