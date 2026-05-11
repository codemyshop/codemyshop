

import { renameAttachment } from '~/server/utils/attachments-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) throw createError({ statusCode: 400, message: 'id produit invalide' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  const body = await readBody<{ id_attachment?: number; name?: string; description?: string }>(event)
  const idAttachment = Number(body?.id_attachment || 0)

  const result = await renameAttachment(
    idAttachment,
    langId,
    String(body?.name || ''),
    String(body?.description ?? ''),
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'rename KO' })
  }
  return {
    success: true,
    id_attachment: result.idAttachment,
    id_lang: result.idLang,
    name: result.name,
  }
})
