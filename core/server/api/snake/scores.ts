/**
 *
 * GET  /api/snake/scores → top 10 leaderboard
 * POST /api/snake/scores → submit score
 *
 * Phase 9b.4d: Direct Drizzle on cs_snake_score (database layer v1.1.0).
 */

import { getMethod, readBody, createError } from 'h3'
import { insertSnakeScore, readSnakeScores } from '~/server/utils/snake-scores'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await readSnakeScores(event, 10)
  }

  if (method === 'POST') {
    const body = await readBody<{ pseudo?: string; score?: number }>(event)

    if (!body.pseudo || typeof body.score !== 'number' || body.score < 0) {
      throw createError({ statusCode: 400, message: 'pseudo (string) et score (number >= 0) requis' })
    }
    const pseudo = body.pseudo.trim().slice(0, 12)
    if (!pseudo) {
      throw createError({ statusCode: 400, message: 'Pseudo invalide' })
    }

    return await insertSnakeScore(pseudo, body.score, event)
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
