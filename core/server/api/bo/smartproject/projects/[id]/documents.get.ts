/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/projects/:id/documents
 * Remplace ac_smartproject/ajaxgetprojectdocuments (chantier #38 Phase B1.3).
 */
import { listProjectDocuments } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID de projet invalide' })
  }
  const documents = await listProjectDocuments(idProject, { event })
  return { success: true, documents }
})
