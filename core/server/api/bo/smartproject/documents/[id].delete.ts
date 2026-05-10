/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/smartproject/documents/:id
 * Remplace ac_smartproject/ajaxdeletedocument (chantier #38 Phase B1.3).
 *
 * Note: file deletion on disk not covered here (cleanup orphans
 * managed in Phase E PrestaShop cutover with re-mount of uploads folder).
 */
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
