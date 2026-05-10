/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'

/**
 * GET /api/bo/inbox/list — Lists the emails captured by inbox:sync.
 *
 * Query params (all optional):
 * - from: LIKE filter on from_email/from_name/client_name (case-insensitive)
 * - subject: LIKE filter on subject (case-insensitive)
 *   - status : 'new'|'spam'|'treated'|'archived'
 * - days: last N days (default 7)
 * - limit: max rows (default 20, max 100)
 * - body: '1' to include the truncated body (notes), otherwise metadata only
 *
 * Replaces the `python3 ac_inbox.py --search-from <name>` Python script.
 */
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
