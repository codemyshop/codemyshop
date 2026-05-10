/**
 *
 * POST /api/bo/email-client/sync — fetch IMAP from the SMTP_USER account + UPSERT
 * into cs_email_message (+ attachments as BYTEA via cs_email_attachment).
 *
 * Skip already persisted messages (UNIQUE (account_user, message_id)).
 *
 * Body :
 * - sinceDays : 1..90 (default 14)
 */

import { fetchRecentMessages } from '~/server/utils/imap'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

function deriveImapHost(smtpHost: string): string {
  if (!smtpHost) return ''
  if (smtpHost.startsWith('smtp.')) return 'imap.' + smtpHost.slice(5)
  return smtpHost
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sinceDays?: number }>(event).catch(() => ({})) as { sinceDays?: number }
  const sinceDays = Math.max(1, Math.min(90, Number(body?.sinceDays || 14)))

  const user = process.env.SMTP_USER || process.env.IMAP_USER
  const pass = process.env.SMTP_PASS || process.env.IMAP_PASS
  if (!user || !pass) {
    throw createError({ statusCode: 503, statusMessage: 'IMAP non configuré (SMTP_USER/SMTP_PASS manquants).' })
  }
  const host = process.env.IMAP_HOST || deriveImapHost(process.env.SMTP_HOST || '')
  const port = Number(process.env.IMAP_PORT || 993)
  if (!host) throw createError({ statusCode: 503, statusMessage: 'IMAP_HOST non résolu.' })

  let messages
  try {
    messages = await fetchRecentMessages({ host, port, user, pass, sinceDays, folder: 'INBOX', timeoutMs: 90_000 })
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: `IMAP fetch failed: ${err?.message || 'unknown'}` })
  }

  const sql = getPgClient()
  let inserted = 0
  let skipped = 0
  let attachmentsInserted = 0

  for (const m of messages) {
    try {
      const upsert = await sql<Array<{ id_email_message: number; was_inserted: boolean }>>`
        INSERT INTO ${sql(PG_SCHEMA)}.cs_email_message
          (account_user, folder, imap_uid, message_id, from_email, from_name,
           to_emails, cc_emails, subject, date_received, body_text, body_html,
           has_attachments, is_read, date_add, date_upd)
        VALUES
          (${user}, 'inbox', ${m.uid || null}, ${m.imapId},
           ${m.fromEmail || null}, ${m.fromName || null},
           ${m.toRaw || null}, ${m.ccRaw || null},
           ${(m.subject || '').slice(0, 998)},
           ${m.dateReceived},
           ${(m.bodyText || '').slice(0, 200_000)},
           ${(m.bodyHtml || '').slice(0, 500_000)},
           ${m.attachments.length > 0 ? 1 : 0}, 0, NOW(), NOW())
        ON CONFLICT (account_user, message_id) DO NOTHING
        RETURNING id_email_message, (xmax = 0) AS was_inserted
      `
      if (upsert.length === 0) {
        skipped++
        continue
      }
      inserted++
      const idMsg = upsert[0].id_email_message
      for (const att of m.attachments) {
        await sql`
          INSERT INTO ${sql(PG_SCHEMA)}.cs_email_attachment
            (id_email_message, filename, mime_type, size_bytes, content, date_add)
          VALUES
            (${idMsg}, ${(att.filename || '').slice(0, 500)},
             ${(att.mimeType || '').slice(0, 255)}, ${att.sizeBytes},
             ${att.content}, NOW())
        `
        attachmentsInserted++
      }
    } catch (err: any) {
      console.warn(`[email-sync] skip ${m.imapId}: ${err?.message}`)
    }
  }

  return {
    account: user,
    fetched: messages.length,
    inserted,
    skipped,
    attachments_inserted: attachmentsInserted,
  }
})
