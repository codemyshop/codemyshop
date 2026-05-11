

import { deleteAeClient } from '~/internal/aetracker/server/utils/aetracker'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid id' })
  }
  try {
    const ok = await deleteAeClient(id, { event })
    return { ok }
  } catch (err: any) {
    console.error('[bo/finance/ae/clients DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'delete failed' })
  }
})
