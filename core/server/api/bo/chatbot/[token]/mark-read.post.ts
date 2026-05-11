

import { useClientDb } from '~/server/utils/db'
import { markConversationRead } from '~/server/utils/chatbot-engine'
import { requireEmployeeSession } from '~/server/utils/session'

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

  await markConversationRead({ event }, Number(conv.id_conversation))
  return { ok: true }
})
