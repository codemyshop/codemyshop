

import { useClientDb } from '~/server/utils/db'

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
