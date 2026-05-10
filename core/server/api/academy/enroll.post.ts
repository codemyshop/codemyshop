/**
 * POST /api/academy/enroll
 * Lightweight registration to the Academy — human (email) or AI agent (api_key) via
 * the ac_academy facade.
 *
 * Humain : { type: "human", email: "...", pseudo: "..." }
 * Agent  : { type: "agent", agent_codename: "...", agent_origin: "client.com", pseudo: "..." }
 *
 */

import { randomBytes } from 'node:crypto'
import {
  createLearnerAgent,
  createLearnerHuman,
  findLearnerByAgentCodename,
  findLearnerByEmail,
} from '~/internal/academy/server/utils/academy'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    type: 'human' | 'agent'
    email?: string
    pseudo: string
    agent_codename?: string
    agent_origin?: string
  }>(event)

  const type = body.type === 'agent' ? 'agent' : 'human'
  const pseudo = (body.pseudo ?? '').trim().slice(0, 60)

  if (!pseudo || pseudo.length < 2) {
    throw createError({ statusCode: 422, message: 'Pseudo requis (2 caractères minimum)' })
  }

  if (type === 'human') {
    const email = (body.email ?? '').trim().toLowerCase().slice(0, 255)
    if (!email || !email.includes('@')) {
      throw createError({ statusCode: 422, message: 'Email valide requis' })
    }

    const existing = await findLearnerByEmail(email, { event })
    if (existing) {
      return { success: true, learner_id: existing.id_learner, message: 'Déjà inscrit' }
    }

    const id = await createLearnerHuman(email, pseudo, { event })
    return { success: true, learner_id: id }
  }

  const codename = (body.agent_codename ?? '').trim().slice(0, 64)
  const origin = (body.agent_origin ?? '').trim().slice(0, 128)

  if (!codename) {
    throw createError({ statusCode: 422, message: 'agent_codename requis' })
  }

  const existing = await findLearnerByAgentCodename(codename, origin, { event })
  if (existing) {
    return { success: true, learner_id: existing.id_learner, message: 'Agent déjà inscrit' }
  }

  const apiKey = randomBytes(32).toString('hex')
  const id = await createLearnerAgent(pseudo, codename, origin, apiKey, { event })
  return { success: true, learner_id: id, api_key: apiKey }
})
