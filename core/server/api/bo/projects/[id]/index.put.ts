

import {
  type SmartProjectUpdateSet,
  updateSmartProject,
} from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) {
    throw createError({ statusCode: 400, message: 'id projet invalide' })
  }

  const body = await readBody(event) as Record<string, any>

  const ALLOWED = ['project_title', 'project_status', 'project_type', 'project_intention', 'budget', 'final_price', 'needs', 'meeting_date', 'reference_client', 'id_ac_smartlead', 'is_archived']

  const sets: SmartProjectUpdateSet[] = []
  for (const col of ALLOWED) {
    if (body[col] !== undefined) {
      const v = body[col] === '' ? null : body[col]
      if (v === null) sets.push({ kind: 'null', column: col })
      else sets.push({ kind: 'value', column: col, value: v })
    }
  }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun champ à mettre à jour' })
  }

  try {
    const affected = await updateSmartProject(id, sets, { event })
    if (affected === 0) {
      throw createError({ statusCode: 404, message: 'Projet introuvable' })
    }
    return { success: true, id }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/projects/update] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur DB' })
  }
})
