/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/projects/:id/mails
 * Remplace ac_smartproject/ajaxgetprojectmails (chantier #38 Phase B1.3).
 *
 * Returns { mails, project_name, contact_infos } — strict alignment with the
 * expected shape by the frontend (cf. core/pages/hub/projects/[id].vue).
 */
import { listProjectMails } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID de projet invalide' })
  }
  const result = await listProjectMails(idProject, { event })
  // Naming aligné sur le PHP existant (clé 'emails' attendue par le front).
  return {
    success: true,
    emails: result.mails,
    project_name: result.project_name,
    contact_infos: result.contact_infos,
  }
})
