/**
 * POST /api/academy/qa
 * Ask a question on a lesson — email auto-enroll + persist DB + AI queue
 * via the ac_academy facade.
 *
 * Body : { module_slug, lesson_index, question, email }
 *
 */

import { getLesson, getModuleBySlug } from '~/server/utils/academy-content'
import { createAiTask } from '~/server/utils/ai-queue'
import {
  createLearnerHuman,
  findLearnerByEmail,
  insertQuestion,
} from '~/internal/academy/server/utils/academy'
import { signToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    module_slug: string
    lesson_index: number
    question: string
    email: string
  }>(event)

  const moduleSlug  = (body.module_slug ?? '').trim()
  const lessonIndex = Number(body.lesson_index ?? 0)
  const question    = (body.question ?? '').trim()
  const email       = (body.email ?? '').trim().toLowerCase()

  if (!moduleSlug || !question || !email) {
    throw createError({ statusCode: 422, message: 'module_slug, question et email requis' })
  }
  if (question.length < 10 || question.length > 1000) {
    throw createError({ statusCode: 422, message: 'Question : 10-1000 caractères' })
  }

  try {
    const pseudo = email.split('@')[0].slice(0, 30)

    let existing = await findLearnerByEmail(email, { event })
    let learnerId: number
    let learnerPseudo: string

    if (!existing) {
      learnerId = await createLearnerHuman(email, pseudo, { event })
      learnerPseudo = pseudo
    } else {
      learnerId = existing.id_learner
      learnerPseudo = existing.pseudo || pseudo
    }

    const idQa = await insertQuestion({
      moduleSlug,
      lessonIndex,
      idStudent: learnerId,
      question,
    }, { event })

    // Queue IA pour réponse async
    const lesson = getLesson(moduleSlug, lessonIndex)
    const mod = getModuleBySlug(moduleSlug)
    const lessonContext = lesson
      ? `Module: ${mod?.title}\nLeçon: ${lesson.title}\nContenu: ${lesson.content}\nÀ retenir: ${lesson.takeaway}`
      : `Module: ${moduleSlug}`

    try {
      await createAiTask({
        name: `academy-qa:${idQa}`,
        clientId: 'ac-hub',
        model: 'mistral-large-latest',
        systemPrompt: `Tu es un assistant pédagogique expert en e-commerce PrestaShop et Nuxt 3. Tu fais partie de l'Academy CodeMyShop d'CodeMyShop. Réponds en français, de manière claire, pratique et directe. Pas de blabla. Des exemples concrets.\n\nContexte de la leçon :\n${lessonContext}`,
        userPrompt: question,
      }, event)
    } catch { /* AI queue may not be available, question is still saved */ }

    const sessionData = { learnerId, email, pseudo: learnerPseudo, role: 'student', clientId: 'ac-hub' }
    const token = signToken(sessionData)
    setCookie(event, 'hub_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return {
      success: true,
      qa: {
        id_qa: idQa,
        question,
        ai_answer: '',
        status: 'pending',
        pseudo: learnerPseudo,
        date_add: new Date().toISOString(),
        upvotes: 0,
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/qa] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur — réessaie.' })
  }
})
