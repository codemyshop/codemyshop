/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listCorbieMessages } from '~/internal/corbie/server/utils/corbie'

/**
 * GET /api/corbie/history?spaceId=xxx
 * Retrieves the conversation history of a space.
 * Source of truth: cs_corbie_messages (DB)
 */
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const query = getQuery(event)
  const spaceId = query.spaceId as string
  if (!spaceId) {
    throw createError({ statusCode: 400, message: 'spaceId requis' })
  }

  const rows = await listCorbieMessages(cookie, spaceId, 100)

  const messages = rows.map((r) => ({
    role: r.role,
    content: r.content,
    agents: r.agentsJson ? JSON.parse(r.agentsJson) : undefined,
  }))

  return { messages }
})
