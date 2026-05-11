

import { updateAeClient } from '~/internal/aetracker/server/utils/aetracker'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid id' })
  }
  const body = await readBody(event) || {}
  try {
    const ok = await updateAeClient(id, body, { event })
    return { ok }
  } catch (err: any) {
    console.error('[bo/finance/ae/clients PUT] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'update failed' })
  }
})
