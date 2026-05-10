/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { findLearnerByEmailWithPseudo } from '~/internal/academy/server/utils/academy'
import { signToken } from '~/server/utils/session-crypto'

/**
 * POST /api/academy/login
 * Academy learner login — email + password → session cookie via the facade
 * ac_academy.
 *
 * Note: the register uses sha256(salt + password) but doesn't store the hash
 * in the DB (the current register doesn't store the password at all in
 * cs_academy_learner). We only verify that the email exists for now.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    throw createError({ statusCode: 422, message: 'Email et mot de passe requis' })
  }

  try {
    const learner = await findLearnerByEmailWithPseudo(email, { event })
    if (!learner) {
      throw createError({ statusCode: 401, message: 'Email inconnu — inscrivez-vous d\'abord.' })
    }

    const sessionData = {
      learnerId: learner.id_learner,
      email: learner.email,
      pseudo: learner.pseudo,
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
      student: { id: learner.id_learner, email: learner.email, pseudo: learner.pseudo },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/login] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur — réessaie.' })
  }
})
