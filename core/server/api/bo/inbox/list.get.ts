

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const from    = (q.from    ? String(q.from)    : '').trim()
  const subject = (q.subject ? String(q.subject) : '').trim()
  const status  = (q.status  ? String(q.status)  : '').trim()
  const days    = Math.min(Math.max(Number(q.days || 7), 1), 90)
  const limit   = Math.min(Math.max(Number(q.limit || 20), 1), 100)
  const wantBody = String(q.body || '') === '1'

  const sql = getPgClient()
  const fromLike    = from    ? `%${from}%`    : null
  const subjectLike = subject ? `%${subject}%` : null
  const statusVal   = status || null

  const rows = await sql<any[]>`
    SELECT
      id_email,
      imap_id,
      from_email,
      from_name,
      subject,
      date_received,
      client_name,
      client_priority,
      mrr,
      status,
      is_bug,
      bug_keyword,
      ai_severity,
      ai_summary,
      ${wantBody ? sql`notes` : sql`NULL::text`} AS body,
      created_at
    FROM ${sql(PG_SCHEMA)}.cs_inbox_emails
    WHERE date_received >= NOW() - (${days} || ' days')::interval
      AND (${fromLike}::text IS NULL
            OR from_email   ILIKE ${fromLike}
            OR from_name    ILIKE ${fromLike}
            OR client_name  ILIKE ${fromLike})
      AND (${subjectLike}::text IS NULL OR subject ILIKE ${subjectLike})
      AND (${statusVal}::text IS NULL  OR status = ${statusVal})
    ORDER BY date_received DESC NULLS LAST
    LIMIT ${limit}
  `
  return {
    ok:    true,
    count: rows.length,
    rows,
  }
})
