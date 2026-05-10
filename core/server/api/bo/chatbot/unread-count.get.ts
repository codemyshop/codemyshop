/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/chatbot/unread-count — lightweight counter for the badge
 * sidebar. Renvoie 2 chiffres :
 * - unread: conversations with an unread user message
 * - takeoverOpen: conversations in takeover mode still open
 * (= handled by a sales agent, not yet closed)
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const r = await db.get<any>(
    `SELECT
        COUNT(*) FILTER (WHERE unread_for_admin = TRUE)::int                   AS unread,
        COUNT(*) FILTER (WHERE human_takeover = TRUE AND status = 'open')::int AS takeover_open
       FROM cs_main.cs_chatbot_conversation`,
  )
  return {
    ok: true,
    unread:       Number(r?.unread || 0),
    takeoverOpen: Number(r?.takeover_open || 0),
  }
})
