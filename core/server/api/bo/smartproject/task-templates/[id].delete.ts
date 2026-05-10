/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/smartproject/task-templates/:id
 * Remplace ac_smartproject/ajaxdeletetasktemplate (chantier #38 Phase B1.1).
 */
import { deleteTaskTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idTemplate = Number(idStr)
  if (!idTemplate || idTemplate <= 0) {
    throw createError({ statusCode: 400, message: 'ID de template invalide' })
  }
  const ok = await deleteTaskTemplate(idTemplate, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Template introuvable' })
  }
  return { success: true }
})
