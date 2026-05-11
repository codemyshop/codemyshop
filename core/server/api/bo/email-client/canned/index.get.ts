

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async () => {
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const sql = getPgClient()
  const rows = await sql<Array<{ id_email_canned: number; label: string; subject: string | null; body: string | null; position: number }>>`
    SELECT id_email_canned, label, subject, body, position
    FROM ${sql(PG_SCHEMA)}.cs_email_canned
    WHERE account_user = ${account} AND active = 1
    ORDER BY position, id_email_canned
  `
  return {
    canned: rows.map(r => ({
      id:       r.id_email_canned,
      label:    r.label,
      subject:  r.subject || '',
      body:     r.body || '',
      position: r.position,
    })),
  }
})
