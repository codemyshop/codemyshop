/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { replaceCorbieHistory } from '~/internal/corbie/server/utils/corbie'

/**
 * POST /api/corbie/history
 * Saves the conversation history to the server.
 * Isolated by profile and space.
 * Source of truth: cs_corbie_messages (DB)
 */
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const body = await readBody<{
    spaceId: string
    messages: { id: string; role: string; content: string; agents?: any[] }[]
  }>(event)

  if (!body.spaceId || !body.messages) {
    throw createError({ statusCode: 400, message: 'spaceId et messages requis' })
  }

  // Garder les 100 derniers messages
  const messages = body.messages.slice(-100)
  const count = await replaceCorbieHistory(cookie, body.spaceId, messages)

  return { success: true, count }
})
