/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * PUT /api/bo/smartproject/tasks/:id
 * Remplace ac_smartproject/ajaxupdateprojecttask (chantier #38 Phase B1.1).
 *
 * Body : { task_title?, task_status?, task_description?, date_deadline?, assigned_to? }
 */
import { updateProjectTask, type UpdateProjectTaskInput } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idTask = Number(idStr)
  if (!idTask || idTask <= 0) {
    throw createError({ statusCode: 400, message: 'ID de tâche invalide' })
  }
  const body = await readBody<UpdateProjectTaskInput>(event)
  try {
    const ok = await updateProjectTask(idTask, body || {}, { event })
    if (!ok) {
      throw createError({ statusCode: 404, message: 'Tâche introuvable ou aucun champ modifié' })
    }
    return { success: true }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 400, message: err?.message || 'Erreur update tâche' })
  }
})
