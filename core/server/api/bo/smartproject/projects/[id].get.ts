/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/projects/:id
 * Remplace ac_smartproject/ajaxgetproject (chantier #38 Phase B1.5).
 *
 * Bugfix in passing: PHP was returning `firstname/lastname/email` but the
 * Nuxt consumer reads `contact_name/contact_email`. We return both for
 * compatibility (same pattern as listActiveSmartProjects).
 *
 * Documents not included in the response: they are loaded separately via
 * /api/bo/smartproject/projects/:id/documents (Phase B1.3).
 */
import { getProjectDetail } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID du projet invalide' })
  }
  const project = await getProjectDetail(idProject, { event })
  if (!project) {
    throw createError({ statusCode: 404, message: 'Projet introuvable' })
  }
  return { success: true, project }
})
