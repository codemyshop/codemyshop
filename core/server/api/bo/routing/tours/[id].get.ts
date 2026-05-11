

import { getTourWithStops } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const result = await getTourWithStops(id, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Tournée introuvable' })

  return { ok: true, tour: result.tour, stops: result.stops }
})
