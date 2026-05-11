

import { deleteAvailability } from '~/enterprise/base/appointment/server/utils/appointment'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const r = await deleteAvailability(id, { event })
  if (!r.deleted) {
    throw createError({ statusCode: 409, statusMessage: r.reason || 'Suppression impossible' })
  }
  return { success: true }
})
