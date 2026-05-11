

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const body = await readBody<{ to?: string; subject?: string; body?: string; replyTo?: string }>(event)
  const messageId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const sql = getPgClient()
  const rows = await sql<Array<{ id_email_message: number }>>`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_email_message
      (account_user, folder, message_id, from_email, from_name, to_emails,
       subject, body_text, has_attachments, is_read, date_add, date_upd)
    VALUES
      (${account}, 'draft', ${messageId},
       ${account}, ${process.env.EMAIL_FROM || account},
       ${(body.to || '').slice(0, 4000) || null},
       ${(body.subject || '').slice(0, 998) || null},
       ${(body.body || '').slice(0, 200_000) || null},
       0, 1, NOW(), NOW())
    RETURNING id_email_message
  `
  return { id: rows[0].id_email_message, messageId }
})
