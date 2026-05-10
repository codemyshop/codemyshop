/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/smartproject/team/:id
 * Remplace ac_smartproject/ajaxdeleteteammember (chantier #38 Phase B1.4).
 */
import { deleteTeamMember } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idMember = Number(idStr)
  if (!idMember || idMember <= 0) {
    throw createError({ statusCode: 400, message: 'ID du membre invalide' })
  }
  const ok = await deleteTeamMember(idMember, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Membre introuvable ou déjà supprimé' })
  }
  return { success: true, message: 'Membre supprimé avec succès' }
})
