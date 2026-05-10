/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

/**
 * GET /api/bo/email-queue — list emails from the queue.
 *
 * Query :
 * ?status=pending|sending|sent|failed|cancelled (by default all)
 * ?limit=100 (by default 100, max 500)
 *
 * Sort: pending first (date_add ASC for FIFO), then the rest (date_add
 * DESC for most recent at the top).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const status = String(q.status || '').trim()
  const limit  = Math.max(1, Math.min(500, Number(q.limit) || 100))

  const sql = getPgClient()

  const rows = status
    ? await sql<any[]>`
        SELECT id_ac_email_queue, to_email, subject, template_slug, id_lang,
               status, priority, attempts, max_attempts, last_error, resend_id,
               scheduled_at, sent_at, date_add, date_upd
        FROM ${sql(PG_SCHEMA)}.cs_email_queue
        WHERE status = ${status}
        ORDER BY date_add DESC
        LIMIT ${limit}
      `
    : await sql<any[]>`
        SELECT id_ac_email_queue, to_email, subject, template_slug, id_lang,
               status, priority, attempts, max_attempts, last_error, resend_id,
               scheduled_at, sent_at, date_add, date_upd
        FROM ${sql(PG_SCHEMA)}.cs_email_queue
        ORDER BY
          CASE status
            WHEN 'pending'   THEN 1
            WHEN 'sending'   THEN 2
            WHEN 'failed'    THEN 3
            WHEN 'sent'      THEN 4
            WHEN 'cancelled' THEN 5
            ELSE 9
          END,
          date_add DESC
        LIMIT ${limit}
      `

  // Compteurs pour le header de l'UI
  const counts = await sql<{ status: string; n: number }[]>`
    SELECT status, COUNT(*)::int AS n
    FROM ${sql(PG_SCHEMA)}.cs_email_queue
    GROUP BY status
  `
  const summary: Record<string, number> = {
    pending: 0, sending: 0, sent: 0, failed: 0, cancelled: 0,
  }
  for (const c of counts) summary[c.status] = c.n

  return { emails: rows, summary }
})
