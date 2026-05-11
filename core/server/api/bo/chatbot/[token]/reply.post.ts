

import { useClientDb } from '~/server/utils/db'
import { sendAgentMessage } from '~/server/utils/chatbot-engine'
import { requireEmployeeSession } from '~/server/utils/session'

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
