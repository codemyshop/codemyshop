/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/projects/:id/documents
 * Remplace ac_smartproject/ajaxaddprojectdocument (chantier #38 Phase B1.3-bis).
 *
 * Body : multipart/form-data
 * - file: the file (1 per request)
 * - title?: displayed title (default = sanitized filename)
 * - type?: business category (default = 'autre')
 *
 * Bugfix vs PHP :
 * - PHP required `documents[][file]` and `documents[][type]` (structure
 * nested array), but the Nuxt caller sent `document` + `id_ac_smartproject`
 * + `document_title` flat — the upload NEVER worked from this UI.
 * - Explicit MIME validation server-side (whitelist, vs no PHP validation).
 * - Nuxt-local storage under .docker-app/server/data/uploads/smartproject/
 * (see doctrine 100% PG / Phase E PrestaShop cutover — files now live
 * on the Nuxt side, no longer in the PS volume).
 *
 * id_owner resolved via the session.
 */
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
