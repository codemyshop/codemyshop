/**
 *
 * Nitro Task — email:client-sync
 *
 * Auto IMAP sync → cs_email_message for the Mail tab of the hub.
 * Different from inbox:sync (which populates cs_inbox_emails with
 * support classification). Here: raw multi-tenant mailbox for
 * the integrated email client (/hub/crm/email Mail tab).
 *
 * Schedule: every 5 minutes, offset minute=2 to avoid conflicting
 * with inbox:sync (minute=0).
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { fetchRecentMessages } from '~/server/utils/imap'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_email_client_sync'

function deriveImapHost(smtpHost: string): string {
  if (!smtpHost) return ''
  if (smtpHost.startsWith('smtp.')) return 'imap.' + smtpHost.slice(5)
  return smtpHost
}

export default defineTask({
  meta: {
    name:        'email:client-sync',
    description: 'Sync IMAP → cs_email_message (mailbox tab Mail du hub).',
  },
  async run() {
    return await withAutomateLock(AUTOMATE_KEY, async () => {
      return await runAutomate(AUTOMATE_KEY, async () => {
        const user = process.env.SMTP_USER || process.env.IMAP_USER
        const pass = process.env.SMTP_PASS || process.env.IMAP_PASS
        if (!user || !pass) {
          return { result: 'skipped: SMTP_USER/SMTP_PASS missing' }
        }
        const host = process.env.IMAP_HOST || deriveImapHost(process.env.SMTP_HOST || '')
        const port = Number(process.env.IMAP_PORT || 993)
        if (!host) return { result: 'skipped: IMAP_HOST not resolved' }

        const sinceDays = Number(process.env.EMAIL_CLIENT_SYNC_SINCE_DAYS || 7)

        let messages
        try {
          messages = await fetchRecentMessages({
            host, port, user, pass,
            sinceDays,
            folder: 'INBOX',
            timeoutMs: 90_000,
          })
        } catch (err: any) {
          throw new Error(`IMAP fetch failed: ${err?.message || 'unknown'}`)
        }

        const sql = getPgClient()
        let inserted = 0
        let skipped = 0
        let attachmentsInserted = 0

        for (const m of messages) {
          try {
            const upsert = await sql<Array<{ id_email_message: number }>>`
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
              RETURNING id_email_message
            `
            if (upsert.length === 0) { skipped++; continue }
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
            console.warn(`[email:client-sync] skip ${m.imapId}: ${err?.message}`)
          }
        }

        return {
          result: `account=${user} fetched=${messages.length} inserted=${inserted} skipped=${skipped} attachments=${attachmentsInserted}`,
        }
      })
    })
  },
})
