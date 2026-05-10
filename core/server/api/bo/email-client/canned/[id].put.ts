/** @author CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'
const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })
  const body = await readBody<{ label?: string; subject?: string; body?: string; position?: number }>(event)
  const sql = getPgClient()
  const rows = await sql<Array<{ id_email_canned: number }>>`
    UPDATE ${sql(PG_SCHEMA)}.cs_email_canned
    SET label    = COALESCE(${body.label?.trim().slice(0, 255) ?? null}, label),
        subject  = COALESCE(${body.subject?.slice(0, 500) ?? null}, subject),
        body     = COALESCE(${body.body ?? null}, body),
        position = COALESCE(${body.position == null ? null : Number(body.position)}, position),
        date_upd = NOW()
    WHERE id_email_canned = ${id} AND account_user = ${account}
    RETURNING id_email_canned
  `
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Modèle introuvable.' })
  return { ok: true }
})
