

import { deleteStop } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  await deleteStop(id, { event })
  return { ok: true }
})
