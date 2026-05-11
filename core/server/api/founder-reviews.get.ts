

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export default defineEventHandler(async () => {
  const result: any = await usePocPg().execute(sql`
    SELECT "id_review", "agent_codename", "review", "sentiment", "session_date", "date_add"
      FROM cs_main.cs_founder_reviews
     ORDER BY "session_date" DESC, "agent_codename" ASC
  `)
  const rows = Array.isArray(result) ? result : (result?.rows ?? [])
  const reviews = rows.map((r: any) => ({
    id_review: Number(r.id_review),
    agent_codename: String(r.agent_codename || ''),
    review: String(r.review || ''),
    sentiment: String(r.sentiment || 'constructive'),
    session_date: String(r.session_date || ''),
    date_add: String(r.date_add || ''),
  }))
  return { reviews }
})
