/** @author CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const sql = getPgClient()
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_email_message
    WHERE id_email_message = ${id}
      AND account_user = ${account}
      AND folder = 'draft'
  `
  return { ok: true }
})
