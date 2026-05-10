/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { takeoverConversation } from '~/server/utils/chatbot-engine'
import { requireEmployeeSession } from '~/server/utils/session'

/**
 * POST /api/bo/chatbot/[token]/takeover — the sales agent takes control.
 * Sets human_takeover=TRUE, records id_employee, pushes a message
 * system bot announcing the takeover (visible to the visitor).
 *
 * Optional body: { greeting?: string } to customize the takeover message
 * Otherwise default greeting.
 */
export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token requis' })

  const body = await readBody(event).catch(() => ({})) as { greeting?: string }
  const greeting = body?.greeting?.trim() || undefined

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, status FROM cs_main.cs_chatbot_conversation
      WHERE conversation_token = ? LIMIT 1`,
    [token],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })
  if (String(conv.status) === 'closed') {
    throw createError({ statusCode: 400, statusMessage: 'Conversation déjà clôturée' })
  }

  await takeoverConversation({ event }, Number(conv.id_conversation), session.employeeId, greeting)
  return { ok: true, idEmployee: session.employeeId }
})
