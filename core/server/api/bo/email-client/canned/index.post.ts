

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const body = await readBody<{ label: string; subject?: string; body?: string; position?: number }>(event)
  if (!body?.label?.trim()) throw createError({ statusCode: 400, statusMessage: 'label requis.' })
  const sql = getPgClient()
  const rows = await sql<Array<{ id_email_canned: number }>>`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_email_canned
      (account_user, label, subject, body, position, active, date_add, date_upd)
    VALUES (${account}, ${body.label.trim().slice(0, 255)},
            ${(body.subject || '').slice(0, 500) || null},
            ${(body.body || '') || null},
            ${Number(body.position || 0)}, 1, NOW(), NOW())
    RETURNING id_email_canned
  `
  return { id: rows[0].id_email_canned }
})
