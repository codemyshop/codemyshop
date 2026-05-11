

import { createSmartProject } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as Record<string, any>

  const title = (body.project_title || '').trim()
  if (!title) {
    throw createError({ statusCode: 400, message: 'project_title requis' })
  }

  try {
    const id = await createSmartProject({
      id_ac_smartlead: body.id_ac_smartlead || 0,
      project_title: title,
      project_type: body.project_type || null,
      project_intention: body.project_intention || null,
      project_status: body.project_status || 'lead_entrant',
      budget: body.budget || null,
      needs: body.needs || null,
    }, { event })
    return { success: true, id }
  } catch (err: any) {
    console.error('[bo/projects/create] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur DB' })
  }
})
