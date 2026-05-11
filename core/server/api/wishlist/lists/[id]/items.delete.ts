

import { requireCustomer } from '~/server/utils/customer-session'
import { removeItem } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const query = getQuery(event)
  const idProduct = Number(query?.id_product || 0)
  const idAttr = Number(query?.id_product_attribute || 0)

  const result = await removeItem(id, session.customerId, idProduct, idAttr, { event })
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'removeItem KO' })
  }
  return { success: true, removed: true }
})
