/**
 * POST /api/academy/register
 * Academy student registration — free, email required, via the ac_academy facade.
 *
 */

import {
  createLearnerHuman,
  createStudentLink,
  findLearnerByEmail,
} from '~/internal/academy/server/utils/academy'
import { signToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    password: string
    pseudo: string
  }>(event)

  const email    = (body.email ?? '').trim().toLowerCase().slice(0, 255)
  const password = (body.password ?? '').slice(0, 200)
  const pseudo   = (body.pseudo ?? '').trim().slice(0, 30)

  if (!email || !password || !pseudo) {
    throw createError({ statusCode: 422, message: 'Email, pseudo et mot de passe requis' })
  }
  if (pseudo.length < 3) {
    throw createError({ statusCode: 422, message: 'Pseudo : 3 caractères minimum' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 422, message: 'Mot de passe : 8 caractères minimum' })
  }

  try {
    const existing = await findLearnerByEmail(email, { event })
    if (existing) {
      throw createError({ statusCode: 409, message: 'Cet email est déjà inscrit' })
    }

    const learnerId = await createLearnerHuman(email, pseudo, { event })

    // Lien legacy student (table optionnelle selon tenant)
    try {
      await createStudentLink(learnerId, pseudo, { event })
    } catch { /* table may not exist on all envs */ }

    const sessionData = {
      learnerId,
      email,
      pseudo,
      role: 'student',
      clientId: 'ac-hub',
    }
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
      student: { id: learnerId, email, pseudo },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/register] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur inscription — réessaie.' })
  }
})
