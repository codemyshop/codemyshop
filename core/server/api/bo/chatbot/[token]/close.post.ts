/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { closeConversation } from '~/server/utils/chatbot-engine'
import { requireEmployeeSession } from '~/server/utils/session'

/**
 * POST /api/bo/chatbot/[token]/close — manually closes a conversation
 * from the hub console. Does not trigger FSM finalization (no
 * smartlead INSERT) — usage: talkative conversations without complete
 * capture, when staff chooses to close.
 */
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token requis' })

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation FROM cs_main.cs_chatbot_conversation
      WHERE conversation_token = ? LIMIT 1`,
    [token],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })

  await closeConversation({ event }, Number(conv.id_conversation))
  return { ok: true }
})
