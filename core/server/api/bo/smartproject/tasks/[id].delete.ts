

import { deleteProjectTask } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idTask = Number(idStr)
  if (!idTask || idTask <= 0) {
    throw createError({ statusCode: 400, message: 'ID de tâche invalide' })
  }
  const { deleted, projectId, countTask } = await deleteProjectTask(idTask, { event })
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Tâche introuvable' })
  }
  return { success: true, projectId, countTask }
})
