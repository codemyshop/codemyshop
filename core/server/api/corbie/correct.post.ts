/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getCorbieConfig, updateCorbieConfigSpaces } from '~/internal/corbie/server/utils/corbie'

/**
 * POST /api/corbie/correct
 * Feedback loop — the user corrects an agent.
 * The correction is saved in the agent's profile (learnedRules)
 * and counted as incidents.
 * Source of truth: cs_corbie_config (DB)
 *
 * Body: { spaceId, agentId, correction }
 */
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const body = await readBody<{
    spaceId: string
    agentId: string
    correction: string
  }>(event)

  if (!body.correction?.trim() || !body.spaceId || !body.agentId) {
    throw createError({ statusCode: 400, message: 'Correction, espace et agent requis' })
  }

  const profileId = cookie
  const row = await getCorbieConfig(profileId)
  if (!row) throw createError({ statusCode: 500, message: 'Config introuvable' })

  const config: any = {
    owner: row.owner,
    spaces: row.spaces ? JSON.parse(row.spaces) : {},
    constitution: row.constitution ? JSON.parse(row.constitution) : null,
  }

  const space = config.spaces?.[body.spaceId]
  if (!space) throw createError({ statusCode: 400, message: 'Espace introuvable' })

  const agent = space.agents?.[body.agentId]
  if (!agent) throw createError({ statusCode: 400, message: 'Agent introuvable' })

  // 1. Ajouter la règle apprise
  if (!agent.learnedRules) agent.learnedRules = []
  agent.learnedRules.push({
    rule: body.correction,
    date: new Date().toISOString(),
  })

  // 2. Injecter dans le systemPrompt
  agent.systemPrompt += `\n\nRÈGLE APPRISE : ${body.correction}`

  // 3. Compter la incidents
  if (!agent.incidents) agent.incidents = 0
  agent.incidents++

  // 4. Ajouter un article à la Constitution
  if (!config.constitution) config.constitution = { title: `Constitution du Synedre de ${config.owner}`, articles: [], learnedArticles: [] }
  if (!config.constitution.learnedArticles) config.constitution.learnedArticles = []
  config.constitution.learnedArticles.push({
    num: config.constitution.learnedArticles.length + 1,
    title: `${agent.name} : ${body.correction.substring(0, 60)}`,
    content: body.correction,
    agent: body.agentId,
    space: body.spaceId,
    date: new Date().toISOString(),
  })

  await updateCorbieConfigSpaces(
    profileId,
    JSON.stringify(config.spaces),
    JSON.stringify(config.constitution),
  )

  return {
    success: true,
    agent: body.agentId,
    incidents: agent.incidents,
    totalRules: agent.learnedRules.length,
    constitutionArticles: config.constitution.learnedArticles.length,
  }
})
