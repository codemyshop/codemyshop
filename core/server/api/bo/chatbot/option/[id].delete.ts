

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const idOption = Number(getRouterParam(event, 'id'))
  if (!idOption || isNaN(idOption)) throw createError({ statusCode: 400, message: 'id invalide' })

  const db = useClientDb(event)
  await db.run(`DELETE FROM cs_chatbot_option_lang WHERE id_option = ?`, [idOption])
  await db.run(`DELETE FROM cs_chatbot_option WHERE id_option = ?`, [idOption])
  return { ok: true, idOption }
})
