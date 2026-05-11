

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

interface MessageRow {
  id_email_message: number
  account_user:     string
  folder:           string
  imap_uid:         number | null
  message_id:       string
  from_email:       string | null
  from_name:        string | null
  to_emails:        string | null
  cc_emails:        string | null
  subject:          string | null
  date_received:    Date | null
  body_text:        string | null
  has_attachments:  number
  is_read:          number
  date_add:         Date
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const folder = (String(query.folder || 'inbox')).toLowerCase()
  if (folder !== 'inbox' && folder !== 'sent' && folder !== 'draft') {
    throw createError({ statusCode: 400, statusMessage: 'folder doit être inbox|sent|draft.' })
  }
  const limit = Math.max(1, Math.min(500, Number(query.limit || 100)))

  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) {
    throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré — impossible de filtrer par compte.' })
  }

  const sql = getPgClient()
  const rows = await sql<MessageRow[]>`
    SELECT id_email_message, account_user, folder, imap_uid, message_id,
           from_email, from_name, to_emails, cc_emails, subject,
           date_received, body_text, has_attachments, is_read, date_add
    FROM ${sql(PG_SCHEMA)}.cs_email_message
    WHERE account_user = ${account} AND folder = ${folder}
    ORDER BY COALESCE(date_received, date_upd, date_add) DESC
    LIMIT ${limit}
  `

  return {
    account,
    folder,
    messages: rows.map(r => ({
      id:            r.id_email_message,
      uid:           r.imap_uid,
      messageId:     r.message_id,
      fromEmail:     r.from_email || '',
      fromName:      r.from_name || '',
      toEmails:      r.to_emails || '',
      ccEmails:      r.cc_emails || '',
      subject:       r.subject || '',
      dateReceived:  r.date_received,
      bodyText:      r.body_text || '',
      hasAttachments: Number(r.has_attachments) === 1,
      isRead:        Number(r.is_read) === 1,
    })),
  }
})
