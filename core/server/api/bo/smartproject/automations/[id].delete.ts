/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/smartproject/automations/:id
 * Remplace ac_smartproject/ajaxdeleteautomation (cascade _log, chantier #38 Phase B1.2).
 */
import { deleteAutomationRule } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idRule = Number(idStr)
  if (!idRule || idRule <= 0) {
    throw createError({ statusCode: 400, message: 'ID de règle invalide' })
  }
  const ok = await deleteAutomationRule(idRule, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Règle introuvable ou déjà supprimée' })
  }
  return { success: true }
})
