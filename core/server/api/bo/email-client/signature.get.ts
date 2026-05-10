/** @author CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async () => {
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const sql = getPgClient()
  const rows = await sql<Array<{ body_text: string | null; body_html: string | null }>>`
    SELECT body_text, body_html
    FROM ${sql(PG_SCHEMA)}.cs_email_signature
    WHERE account_user = ${account}
    LIMIT 1
  `
  return {
    signature: {
      bodyText: rows[0]?.body_text || '',
      bodyHtml: rows[0]?.body_html || '',
    },
  }
})
