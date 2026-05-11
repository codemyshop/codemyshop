

import { createHash } from 'node:crypto'
import {
  averageModuleScore,
  countDistinctModulesStarted,
  findLearnerById,
  getModuleProgressTotals,
  insertCertificate,
  updateLearnerStartedCount,
  upsertProgress,
} from '~/internal/academy/server/utils/academy'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    learner_id: number
    module_slug: string
    lesson_index: number
    status?: 'started' | 'completed'
    score?: number
    time_spent?: number
  }>(event)

  const learnerId = Number(body.learner_id)
  const moduleSlug = (body.module_slug ?? '').trim()
  const lessonIndex = Number(body.lesson_index ?? 0)
  const status: 'started' | 'completed' = body.status === 'completed' ? 'completed' : 'started'
  const score = Math.min(100, Math.max(0, Number(body.score ?? 0)))
  const timeSpent = Math.max(0, Number(body.time_spent ?? 0))

  if (!learnerId || !moduleSlug) {
    throw createError({ statusCode: 422, message: 'learner_id et module_slug requis' })
  }

  try {
    const learner = await findLearnerById(learnerId, { event })
    if (!learner) {
      throw createError({ statusCode: 404, message: 'Apprenant introuvable' })
    }

    await upsertProgress({ idLearner: learnerId, moduleSlug, lessonIndex, status, score, timeSpent }, { event })

    const started = await countDistinctModulesStarted(learnerId, { event })
    await updateLearnerStartedCount(learnerId, started, { event })

    if (status === 'completed') {
      const { total, done } = await getModuleProgressTotals(learnerId, moduleSlug, { event })
      if (done === total && total > 0) {
        const hash = createHash('sha256')
          .update(`${learnerId}-${moduleSlug}-${Date.now()}`)
          .digest('hex').slice(0, 16)
        const avgScore = await averageModuleScore(learnerId, moduleSlug, { event })
        await insertCertificate({
          idLearner: learnerId,
          moduleSlug,
          score: avgScore,
          mentor: '',
          hash,
        }, { event }).catch(() => {})
      }
    }

    return { success: true, status, module_slug: moduleSlug, lesson_index: lessonIndex }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/progress] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur — réessaie.' })
  }
})
