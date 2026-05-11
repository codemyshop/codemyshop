

import { getOrderStatesFromDb } from '~/server/utils/orders-db'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getOrderStatesFromDb(ctx)
})
