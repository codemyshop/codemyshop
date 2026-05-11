

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const body = await readBody<{ bodyText?: string; bodyHtml?: string }>(event)
  const sql = getPgClient()
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_email_signature
      (account_user, body_text, body_html, date_add, date_upd)
    VALUES (${account}, ${body.bodyText ?? null}, ${body.bodyHtml ?? null}, NOW(), NOW())
    ON CONFLICT (account_user) DO UPDATE SET
      body_text = EXCLUDED.body_text,
      body_html = EXCLUDED.body_html,
      date_upd  = NOW()
  `
  return { ok: true }
})
