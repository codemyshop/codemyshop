

import { listForProduct } from '~/server/utils/attachments-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) throw createError({ statusCode: 400, message: 'id produit invalide' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  const list = await listForProduct(id, langId, { event })
  return {
    success: true,
    attachments: list.map((a) => ({
      id_attachment: a.idAttachment,
      file: a.file,
      file_name: a.fileName,
      file_size: a.fileSize,
      mime: a.mime,
      name: a.name,
      description: a.description,
      public_url: a.publicUrl,
    })),
    total: list.length,
  }
})
