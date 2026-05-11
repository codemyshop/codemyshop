

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const db = useClientDb(event)
  const { affectedRows } = await db.run(
    `UPDATE ps_address SET deleted = 1, date_upd = NOW() WHERE id_address = ?`,
    [id],
  )
  if (!affectedRows) throw createError({ statusCode: 404, message: 'Adresse introuvable' })

  return { ok: true, id }
})
