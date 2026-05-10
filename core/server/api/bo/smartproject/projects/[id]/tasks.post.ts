/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/projects/:id/tasks
 * Remplace ac_smartproject/ajaxaddprojecttask (bulk insert, chantier #38 Phase B1.1).
 *
 * Body : { tasks: [{ name, status?, description?, assigned_to?, date_deadline? }, ...] }
 */
import { createProjectTasks, type CreateTaskInput } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID de projet invalide' })
  }
  const body = await readBody<{ tasks?: CreateTaskInput[] }>(event)
  if (!body || !Array.isArray(body.tasks)) {
    throw createError({ statusCode: 400, message: 'Paramètres invalides : tasks[] attendu' })
  }
  const result = await createProjectTasks(idProject, body.tasks, { event })
  return { success: true, ...result }
})
