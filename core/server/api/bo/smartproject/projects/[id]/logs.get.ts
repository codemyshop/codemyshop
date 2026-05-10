/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/projects/:id/logs
 * Remplace ac_smartproject/ajaxgetprojectlogs (chantier #38 Phase B1.5).
 */
import { listProjectLogs } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID du projet invalide' })
  }
  const logs = await listProjectLogs(idProject, { event })
  return { success: true, logs }
})
