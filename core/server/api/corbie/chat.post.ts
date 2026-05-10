/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/corbie/chat
 * Orchestration: the primary agent is the spokesperson.
 *
 * 1. The 3 agents produce their perspective in parallel
 * 2. The lead integrates the 2 other perspectives into its voice
 * 3. Unless the user explicitly requests the opinions of the others
 *
 * Source of truth: cs_corbie_config + cs_corbie_signals (DB)
 */
import { generateContent } from '~/server/services/ai-gateway'
import {
  getCorbieConfig,
  insertCorbieSignal,
  purgeOldCorbieSignals,
} from '~/internal/corbie/server/utils/corbie'

interface CorbieMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AgentConfig {
  name: string
  emoji: string
  systemPrompt: string
  description: string
}

interface SpaceConfig {
  name: string
  emoji: string
  description: string
  tone?: string
  agents: Record<string, AgentConfig>
}

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const body = await readBody<{
    message: string
    spaceId: string
    mode?: 'lead' | 'conseil'
    history?: CorbieMessage[]
  }>(event)

  if (!body.message?.trim()) {
    throw createError({ statusCode: 400, message: 'Message vide' })
  }

  const profileId = cookie
  const row = await getCorbieConfig(profileId)
  if (!row?.spaces) {
    throw createError({ statusCode: 500, message: 'Configuration non initialisée.' })
  }

  const config = { owner: row.owner, spaces: JSON.parse(row.spaces) as Record<string, SpaceConfig> }
  const space = config.spaces[body.spaceId]
  if (!space) {
    throw createError({ statusCode: 400, message: `Espace "${body.spaceId}" introuvable` })
  }

  const agents = space.agents
  const agentList = Object.entries(agents)
  const history = (body.history || []).slice(-16)
  const msg = body.message.toLowerCase()

  const [leadId, leadAgent] = agentList[0]
  const supportAgents = agentList.slice(1)

  const wantsAllVoices = body.mode === 'conseil' || msg.includes('avis') || msg.includes('qu\'en pens') || msg.includes('les autres') || (msg.includes('qu\'est-ce que') && (msg.includes('pense') || msg.includes('dit')))

  const historyText = history
    .map(m => `${m.role === 'user' ? config.owner : leadAgent.name}: ${m.content}`)
    .join('\n')

  const userPrompt = historyText
    ? `${historyText}\n\n${config.owner}: ${body.message}`
    : `${config.owner}: ${body.message}`

  let finalContent: string
  let respondingAgents: { id: string; emoji: string; name: string }[]

  if (wantsAllVoices) {
    const perspectives = await Promise.all(
      agentList.map(async ([id, agent]) => {
        try {
          const resp = await generateContent({
            prompt: userPrompt,
            systemPrompt: agent.systemPrompt,
            provider: 'mistral',
            maxTokens: 300,
            temperature: 0.7,
          })
          return { id, name: agent.name, emoji: agent.emoji, content: resp.content }
        } catch {
          return null
        }
      })
    )

    const valid = perspectives.filter(Boolean) as { id: string; name: string; emoji: string; content: string }[]
    finalContent = valid.map(p => `${p.emoji} ${p.name}\n${p.content}`).join('\n\n')
    respondingAgents = valid.map(p => ({ id: p.id, emoji: p.emoji, name: p.name }))

  } else {
    const supportNotes = await Promise.all(
      supportAgents.map(async ([_id, agent]) => {
        try {
          const resp = await generateContent({
            prompt: `${config.owner} dit : "${body.message}"\n\nDonne ta perspective en 2-3 phrases maximum. Pas de formule de politesse. Juste ton avis professionnel.`,
            systemPrompt: agent.systemPrompt,
            provider: 'mistral',
            model: 'mistral-small-latest',
            maxTokens: 150,
            temperature: 0.5,
          })
          return { name: agent.name, note: resp.content }
        } catch {
          return null
        }
      })
    )

    const validNotes = supportNotes.filter(Boolean) as { name: string; note: string }[]
    const notesContext = validNotes.length
      ? `\n\nNotes de ton équipe (intègre-les naturellement, ne les cite pas) :\n${validNotes.map(n => `- ${n.name} : ${n.note}`).join('\n')}`
      : ''

    const leadResponse = await generateContent({
      prompt: userPrompt + notesContext,
      systemPrompt: leadAgent.systemPrompt + '\n\nTu es le porte-parole de ton espace. Tu intègres naturellement les perspectives de ton équipe dans ta réponse, sans jamais dire "selon le pédiatre" ou "le comptable pense que". Tu parles avec TA voix, enrichie par LEUR expertise.\n\nFORMAT OBLIGATOIRE : Réponds en 3-5 phrases MAXIMUM. Comme un message vocal court. Pas de pavé de texte. Pas de liste. Pas de paragraphes multiples. Va droit au but.',
      provider: 'anthropic',
      maxTokens: 300,
      temperature: 0.7,
    })

    finalContent = leadResponse.content
    respondingAgents = [{ id: leadId, emoji: leadAgent.emoji, name: leadAgent.name }]
  }

  // Signaux inter-espaces (DB)
  try {
    if (body.spaceId === 'enfants' && (msg.includes('nuit') || msg.includes('réveils') || msg.includes('pleure'))) {
      await insertCorbieSignal(profileId, 'enfants', 'couple', 'hard_nights', 'Nuits difficiles')
    }
    if (msg.includes('fatiguée') || msg.includes('épuisée') || msg.includes('triste')) {
      await insertCorbieSignal(profileId, body.spaceId, 'sport', 'low_mood', 'Humeur basse')
    }
    await purgeOldCorbieSignals(profileId, 30)
  } catch {}

  return { content: finalContent, agents: respondingAgents }
})
