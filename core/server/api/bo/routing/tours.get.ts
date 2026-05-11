

import { listTours } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const date = String(q.date || '').trim() || null
  const tours = await listTours(date, { event })
  return { ok: true, tours }
})
