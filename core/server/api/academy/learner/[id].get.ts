/**
 * GET /api/academy/learner/:id
 * Profile of a learner with their complete progress via the ac_academy facade.
 *
 */

import {
  getLearnerProfile,
  listLearnerCertificates,
  listLearnerProgress,
} from '~/internal/academy/server/utils/academy'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, message: 'ID apprenant requis' })
  }

  try {
    const learner = await getLearnerProfile(id, { event })
    if (!learner) {
      throw createError({ statusCode: 404, message: 'Apprenant introuvable' })
    }

    const [progress, certificates] = await Promise.all([
      listLearnerProgress(id, { event }),
      listLearnerCertificates(id, { event }),
    ])

    return { learner, progress, certificates }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/learner] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur — réessaie.' })
  }
})
