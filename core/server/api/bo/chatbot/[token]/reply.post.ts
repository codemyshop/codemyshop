/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { sendAgentMessage } from '~/server/utils/chatbot-engine'
import { requireEmployeeSession } from '~/server/utils/session'

/**
 * POST /api/bo/chatbot/[token]/reply — sends a message from the sales agent.
 * Body { message: string }. Fails if the conversation is not in
 * takeover mode (the sales agent must click "Take control" first).
 */
export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token requis' })

  const body = await readBody(event) as { message?: string }
  const message = String(body?.message || '').trim()
  if (!message) throw createError({ statusCode: 400, statusMessage: 'Message vide' })

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, status, human_takeover
       FROM cs_main.cs_chatbot_conversation
      WHERE conversation_token = ? LIMIT 1`,
    [token],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })
  if (String(conv.status) === 'closed') {
    throw createError({ statusCode: 400, statusMessage: 'Conversation clôturée' })
  }
  if (!conv.human_takeover) {
    throw createError({ statusCode: 400, statusMessage: 'Reprenez la main avant de répondre' })
  }

  await sendAgentMessage({ event }, Number(conv.id_conversation), message, session.employeeId)
  return { ok: true }
})
