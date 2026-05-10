/**
 *
 * GET /api/bo/email-client/messages/[id]/attachments — lists attachments
 * of a message (without content).
 */

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })

  const account = process.env.SMTP_USER || process.env.IMAP_USER
  if (!account) throw createError({ statusCode: 503, statusMessage: 'SMTP_USER non configuré.' })

  const sql = getPgClient()
  // Vérifie que le message appartient au compte courant (anti cross-account)
  const owns = await sql<Array<{ id_email_message: number }>>`
    SELECT id_email_message FROM ${sql(PG_SCHEMA)}.cs_email_message
    WHERE id_email_message = ${id} AND account_user = ${account} LIMIT 1
  `
  if (owns.length === 0) throw createError({ statusCode: 404, statusMessage: 'Message introuvable.' })

  const rows = await sql<Array<{ id_email_attachment: number; filename: string; mime_type: string; size_bytes: number }>>`
    SELECT id_email_attachment, filename, mime_type, size_bytes
    FROM ${sql(PG_SCHEMA)}.cs_email_attachment
    WHERE id_email_message = ${id}
    ORDER BY id_email_attachment
  `
  return {
    attachments: rows.map(r => ({
      id:        r.id_email_attachment,
      filename:  r.filename,
      mimeType:  r.mime_type,
      sizeBytes: r.size_bytes,
    })),
  }
})
