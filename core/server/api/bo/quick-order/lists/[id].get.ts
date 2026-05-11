

import { getListWithLines } from '~/modules/quickorder/server/utils/quickorder'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const result = await getListWithLines(id, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'liste introuvable' })

  return { ok: true, list: result.list, lines: result.lines }
})
