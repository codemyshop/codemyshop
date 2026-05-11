

import { createCartInDb, getCartFromDb } from '~/server/utils/cart-db'
import { getCustomerSession, resolveCustomerIdForRequest } from '~/server/utils/customer-session'
import { attachActionToSession } from '~/internal/impersonation/server/utils/impersonation'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ customerId?: number | string; clientId?: string }>(event)
  const customerId = resolveCustomerIdForRequest(event, body?.customerId)
  if (!customerId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = body?.clientId ? { clientId: String(body.clientId) } : { event }
  const id = await createCartInDb(customerId, ctx)

  const session = getCustomerSession(event)
  if (session?.isImpersonated && session.impersonationSessionId) {
    await attachActionToSession(session.impersonationSessionId, { idCart: id }).catch(err => {
      console.error('[cart/create] impersonation audit failed:', err?.message || err)
    })
  }

  return (await getCartFromDb(id, ctx)) ?? { id, customerId, items: [], totalHT: 0, totalTTC: 0, totalTax: 0, shippingCost: 0, carrierId: null }
})
