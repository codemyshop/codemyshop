

import { getLastActiveCartFromDb } from '~/server/utils/cart-db'
import { resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const { customerId, clientId } = getQuery(event) as { customerId?: string; clientId?: string }
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getLastActiveCartFromDb(resolvedId, ctx)
})
