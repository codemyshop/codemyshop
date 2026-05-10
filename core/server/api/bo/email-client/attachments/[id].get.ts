/**
 *
 * GET /api/bo/email-client/attachments/[id] — binary stream of an attachment
 * (BYTEA → response). Filter by current SMTP account to prevent
 * fuites cross-tenant.
 */

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

interface Row {
  filename:    string | null
  mime_type:   string | null
  content:     Buffer | null
  account_user: string
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })

  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })

  const sql = getPgClient()
  const rows = await sql<Row[]>`
    SELECT a.filename, a.mime_type, a.content, m.account_user
    FROM ${sql(PG_SCHEMA)}.cs_email_attachment a
    JOIN ${sql(PG_SCHEMA)}.cs_email_message m
      ON m.id_email_message = a.id_email_message
    WHERE a.id_email_attachment = ${id}
    LIMIT 1
  `
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Pièce jointe introuvable.' })
  const r = rows[0]
  if (r.account_user !== account) throw createError({ statusCode: 403, statusMessage: 'Accès interdit.' })
  if (!r.content) throw createError({ statusCode: 404, statusMessage: 'Contenu vide.' })

  // r.content sera un Buffer (postgres-js décode BYTEA → Buffer)
  const buf = Buffer.isBuffer(r.content) ? r.content : Buffer.from(r.content as any)
  setHeader(event, 'Content-Type',  r.mime_type || 'application/octet-stream')
  setHeader(event, 'Content-Length', String(buf.length))
  if (r.filename) {
    setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(r.filename)}"`)
  }
  return buf
})
