

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })
  const sql = getPgClient()
  const rows = await sql<any[]>`
    SELECT * FROM ${sql(PG_SCHEMA)}.cs_inbox_emails WHERE id_email = ${id}
  `
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Email introuvable' })
  return { ok: true, email: rows[0] }
})
