

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const body = await readBody<{ to?: string; subject?: string; body?: string }>(event)
  const sql = getPgClient()
  const rows = await sql<Array<{ id_email_message: number }>>`
    UPDATE ${sql(PG_SCHEMA)}.cs_email_message
    SET to_emails = ${(body.to || '').slice(0, 4000) || null},
        subject   = ${(body.subject || '').slice(0, 998) || null},
        body_text = ${(body.body || '').slice(0, 200_000) || null},
        date_upd  = NOW()
    WHERE id_email_message = ${id}
      AND account_user = ${account}
      AND folder = 'draft'
    RETURNING id_email_message
  `
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Brouillon introuvable.' })
  return { ok: true }
})
