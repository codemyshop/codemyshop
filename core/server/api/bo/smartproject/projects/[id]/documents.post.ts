

import { addProjectDocument } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID du projet invalide' })
  }

  const form = await readMultipartFormData(event)
  if (!form || !form.length) {
    throw createError({ statusCode: 400, message: 'Body multipart vide' })
  }
  const filePart = form.find((p) => p.name === 'file' || p.name === 'document')
  if (!filePart || !filePart.data || !filePart.filename) {
    throw createError({ statusCode: 422, message: 'Champ file requis' })
  }
  const titlePart = form.find((p) => p.name === 'title' || p.name === 'document_title')
  const typePart = form.find((p) => p.name === 'type' || p.name === 'document_type')

  const session = getSession(event)
  const idOwner = Number(session?.employeeId ?? 0)

  const result = await addProjectDocument(
    {
      idProject,
      idOwner,
      buffer: filePart.data,
      origName: filePart.filename,
      mime: filePart.type || 'application/octet-stream',
      documentTitle: titlePart?.data?.toString('utf-8') ?? null,
      documentType: typePart?.data?.toString('utf-8') ?? null,
    },
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: result.status, message: result.error })
  }
  return { success: true, document: result.document }
})
