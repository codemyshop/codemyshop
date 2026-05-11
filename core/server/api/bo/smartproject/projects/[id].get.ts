

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
