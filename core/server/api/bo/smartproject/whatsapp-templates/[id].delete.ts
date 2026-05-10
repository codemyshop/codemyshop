/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/smartproject/whatsapp-templates/:id
 * Remplace ac_smartproject/ajaxdeletewatemplate (cascade _lang, chantier #38 Phase B1.4).
 */
import { deleteWaTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idTemplate = Number(idStr)
  if (!idTemplate || idTemplate <= 0) {
    throw createError({ statusCode: 400, message: 'ID du template invalide' })
  }
  const ok = await deleteWaTemplate(idTemplate, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Template introuvable ou déjà supprimé' })
  }
  return { success: true }
})
