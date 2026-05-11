

import { updateSmartProjectStatus } from '~/enterprise/base/smartproject/server/utils/smartproject'

const VALID_STATUSES = new Set([
  'perdu_standby',
  'lead_entrant',
  'qualification',
  'devis_envoye',
  'devis_accepte',
  'en_cours',
  'livraison',
  'facture',
  'gagne',
])

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) {
    throw createError({ statusCode: 400, message: 'id projet invalide' })
  }

  const body = await readBody(event) as { project_status?: string }
  const status = (body.project_status || '').trim()

  if (!status || !VALID_STATUSES.has(status)) {
    throw createError({ statusCode: 400, message: `Statut invalide : ${status}` })
  }

  try {
    const affected = await updateSmartProjectStatus(id, status, { event })
    if (affected === 0) {
      throw createError({ statusCode: 404, message: 'Projet introuvable' })
    }
    return { success: true, id, project_status: status }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/projects/status] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur DB' })
  }
})
